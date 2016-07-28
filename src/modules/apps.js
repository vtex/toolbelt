import ora from 'ora'
import chalk from 'chalk'
import log from '../logger'
import moment from 'moment'
import tinylr from 'tiny-lr'
import Table from 'cli-table'
import inquirer from 'inquirer'
import readline from 'readline'
import debounce from 'debounce'
import {logChanges} from '../apps'
import {Promise, all} from 'bluebird'
import userAgent from '../user-agent'
import request from 'request-promise'
import {map, uniqBy, prop} from 'ramda'
import {getWorkspaceURL} from '../workspace'
import {renderWatch, renderBuild} from '../render'
import {AppsClient, RegistryClient} from '@vtex/apps'
import {getToken, getAccount, getWorkspace} from '../conf'
import {
  manifest,
  namePattern,
  vendorPattern,
  wildVersionPattern,
} from '../manifest'
import {
  watch,
  compressFiles,
  fallbackBuild,
  fallbackWatch,
  createTempPath,
  listLocalFiles,
  deleteTempFile,
  createBuildFolder,
  removeBuildFolder,
} from '../file'

let spinner

const lrServer = tinylr({
  errorListener (err) {
    if (err.code === 'EADDRINUSE') { return }
    throw new Error(err)
  },
})

const root = process.cwd()

const pathProp = prop('path')

const {vendor, name, version} = manifest

const appsClient = () => new AppsClient({
  endpointUrl: 'http://api.beta.vtex.com',
  authToken: getToken(),
  userAgent: userAgent,
})

const registryClient = () => new RegistryClient({
  endpointUrl: 'http://api.beta.vtex.com',
  authToken: getToken(),
  userAgent: userAgent,
})

const sendChanges = (() => {
  let queue = []
  const publishPatch = debounce(
    (account, workspace, vendor, name, version) => {
      return registryClient().publishAppPatch(
        account,
        workspace,
        vendor,
        name,
        version,
        queue
      )
      .then(() => installApp(vendor, name, version))
      .then(() => sendChangesToLr(queue))
      .then(() => spinner.stop())
      .then(() => logChanges(queue, moment().format('HH:mm:ss')))
      .then(log => log.length > 0 ? console.log(log) : null)
      .then(() => { queue = [] })
    },
    200
  )
  return changes => {
    if (changes.length === 0) {
      return
    }
    spinner = spinner || ora('Sending changes...')
    spinner.start()
    queue = uniqBy(pathProp, queue.concat(changes).reverse())
    return publishPatch(getAccount(), getWorkspace(), vendor, name, version)
  }
})()

const keepAppAlive = () => {
  return installApp(vendor, name, version)
  .then(() => {
    const keepAliveInterval = setInterval(() => {
      appsClient().updateAppTtl(
        getAccount(),
        getWorkspace(),
        vendor,
        name,
        version
      )
    }, 20000)
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', () => {
      if (spinner) {
        spinner.stop()
      }
      log.info('Exiting...')
      lrServer.close()
      clearTimeout(keepAliveInterval)
      process.exit()
    })
  })
}

const sendChangesToLr = changes => {
  const files = map(pathProp, changes)
  return request({
    method: 'POST',
    uri: 'http://localhost:35729/changed',
    json: {files},
  })
}

const installApp = (vendor, name, version, ttl = null) => {
  const actualVersion = ttl ? `${version}+rc` : version
  return appsClient().installApp(
    getAccount(),
    getWorkspace(),
    {vendor, name, version: actualVersion},
    ttl
  )
}

const publishApp = (file, pre = false) => {
  return registryClient().publishApp(
    getAccount(),
    getWorkspace(),
    file,
    pre
  )
}

export default {
  list: {
    alias: 'ls',
    'optionalArgs': 'query',
    description: 'List your installed VTEX apps',
    handler: () => {
      log.debug('Starting to list apps')
      appsClient().listApps(
        getAccount(),
        getWorkspace()
      )
      .then(res => {
        if (res.length === 0) {
          return log.info('You have no installed apps')
        }
        const table = new Table({
          head: ['Vendor', 'Name', 'Version'],
        })
        res.forEach(r => {
          table.push([
            r.vendor,
            r.name,
            r.version,
          ])
        })
        console.log(table.toString())
      })
    },
  },
  watch: {
    description: 'Send the files to the registry and watch for changes',
    handler: () => {
      log.info('Watching app', `${vendor}.${name}@${version}`)
      console.log(
        chalk.green('Your URL:'),
        chalk.blue(getWorkspaceURL(getAccount(), getWorkspace()))
      )
      let tempPath
      log.debug('Removing build folder...')
      return removeBuildFolder(root)
      .tap(() => log.debug('Creating build folder...'))
      .then(() => createBuildFolder(root))
      .then(() => {
        log.debug('Building render files...')
        log.debug('Copying fallback folders or files...')
        log.debug('Creating temp path...')
        return all([
          renderBuild(root, manifest),
          fallbackBuild(root),
          createTempPath(name, version).then(t => { tempPath = t }),
        ])
      })
      .then(() => {
        log.debug('Listing local files...')
        log.debug('Starting local live reload server...')
        return all([
          listLocalFiles(root),
          lrServer.listen(),
        ])
      })
      .spread(files => compressFiles(files, tempPath))
      .tap(() => log.debug('Publishing app...'))
      .then(({file}) => publishApp(file, true))
      .tap(() => log.debug('Deleting temp file...'))
      .then(() => deleteTempFile(tempPath))
      .then(keepAppAlive)
      .tap(() => log.debug('Starting watch...'))
      .then(() => watch(root, sendChanges))
      .then(() => renderWatch(root, manifest))
      .then(() => fallbackWatch(root))
    },
  },
  install: {
    requiredArgs: 'app',
    alias: 'i',
    description: 'Install the specified app',
    handler: (app) => {
      log.debug('Starting to install app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}@${wildVersionPattern}$`)
      if (!appRegex.test(app)) {
        return log.error('Invalid app format, please use <vendor>.<name>@<version>')
      }
      const [vendorAndName, version] = app.split('@')
      const [vendor, name] = vendorAndName.split('.')
      installApp(vendor, name, version)
      .then(() => log.info(`Installed app ${app} succesfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} already installed`)
        }
        throw new Error(err)
      })
    },
  },
  uninstall: {
    requiredArgs: 'app',
    description: 'Uninstall the specified app',
    handler: (app) => {
      log.debug('Starting to uninstall app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}@${wildVersionPattern}$`)
      if (!appRegex.test(app)) {
        return log.error('Invalid app format, please use <vendor>.<name>@<version>')
      }
      const [vendorAndName, version] = app.split('@')
      const [vendor, name] = vendorAndName.split('.')
      Promise.try(() =>
        inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to uninstall the app ${app}?`,
        })
      )
      .then(({confirm}) => confirm || Promise.reject('User cancelled'))
      .then(() =>
        appsClient().uninstallApp(
          getAccount(),
          getWorkspace(),
          vendor,
          name,
          version
        )
      )
      .then(() => log.info(`Uninstalled app ${app} succesfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} not installed`)
        }
        throw new Error(err)
      })
    },
  },
  publish: {
    description: 'Publish this app',
    handler: () => {
      log.debug('Starting to publish app')
      spinner = ora('Publishing app...').start()
      removeBuildFolder(root)
      .then(() => all([
        createTempPath(name, version),
        renderBuild(root, manifest),
      ]))
      .spread(tempPath =>
        listLocalFiles(root)
        .then(files => compressFiles(files, tempPath))
        .then(({file}) => publishApp(file))
        .then(() => deleteTempFile(tempPath))
        .then(() => spinner.stop())
        .then(() => log.info(`Published app ${vendor}.${name}@${version} succesfully`))
        .catch(res => {
          if (spinner) {
            spinner.stop()
          }
          return res.error.code === 'app_version_already_exists'
            ? log.error(`Version ${version} already published!`)
            : Promise.reject(res)
        })
      )
    },
  },
}
