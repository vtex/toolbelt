import ora from 'ora'
import chalk from 'chalk'
import log from '../logger'
import moment from 'moment'
import tinylr from 'tiny-lr'
import Table from 'cli-table'
import inquirer from 'inquirer'
import readline from 'readline'
import debounce from 'debounce'
import jp from 'jsonpath'
import {logChanges} from '../apps'
import {Promise, all} from 'bluebird'
import userAgent from '../user-agent'
import http from 'requisition'
import courier from '../courier'
import {uniqBy, prop} from 'ramda'
import {getWorkspaceURL} from '../workspace'
import {AppsClient, RegistryClient} from '@vtex/api'
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
  createTempPath,
  listLocalFiles,
  deleteTempFile,
} from '../file'

let spinner

const KEEP_ALIVE_INTERVAL = 5000

const lrServer = tinylr({
  errorListener (err) {
    if (err.code === 'EADDRINUSE') { return }
    throw new Error(err)
  },
})

const root = process.cwd()

const pathProp = prop('path')

const id = `${manifest.vendor}.${manifest.name}@${manifest.version}`

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
      .then(() => installApp(`${vendor}.${name}@${version}+rc`))
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
    return publishPatch(getAccount(), getWorkspace(), manifest.vendor, manifest.name, manifest.version)
  }
})()

const keepAppAlive = () => {
  return installApp(`${id}+rc`)
  .then(() => {
    const keepAliveInterval = setInterval(() => {
      appsClient().updateAppTtl(
        getAccount(),
        getWorkspace(),
        id,
      )
    }, KEEP_ALIVE_INTERVAL)
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

const sendChangesToLr = () => {
  return http.post('http://localhost:35729/changed').send({files: ['']})
}

const installApp = (id) => {
  const [vendorAndName, version] = id.split('@')
  const [vendor, name] = vendorAndName.split('.')
  return appsClient().installApp(
    getAccount(),
    getWorkspace(),
    {vendor, name, version}
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

      return appsClient().listApps(
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
      log.info('Watching app', `${id}`)
      console.log(
        chalk.green('Your URL:'),
        chalk.blue(getWorkspaceURL(getAccount(), getWorkspace()))
      )
      courier.listen(getAccount(), getWorkspace(), getToken(), sendChangesToLr)
      let tempPath
      log.debug('Creating temp path...')

      return createTempPath(id).then(t => { tempPath = t })
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

      return installApp(app)
      .then(() => log.info(`Installed app ${app} successfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} already installed`)
        }
        return Promise.reject(err)
      })
    },
  },
  uninstall: {
    requiredArgs: 'app',
    description: 'Uninstall the specified app',
    handler: (app) => {
      log.debug('Starting to uninstall app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}$`)
      if (!appRegex.test(app)) {
        log.error('Invalid app format, please use <vendor>.<name>')
        return Promise.resolve()
      }

      return Promise.try(() =>
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
          app
        )
      )
      .then(() => log.info(`Uninstalled app ${app} successfully`))
      .catch(err => {
        if (err.statusCode === 409) {
          return log.error(`App ${app} not installed`)
        }
        return Promise.reject(err)
      })
    },
  },
  publish: {
    description: 'Publish this app',
    handler: () => {
      log.debug('Starting to publish app')
      spinner = ora('Publishing app...').start()

      return createTempPath(id).then(tempPath =>
        listLocalFiles(root)
        .then(files => compressFiles(files, tempPath))
        .then(({file}) => publishApp(file))
        .then(() => deleteTempFile(tempPath))
        .finally(() => spinner.stop())
        .then(() => log.info(`Published app ${id} successfully`))
        .catch(res => res.error && res.error.code === 'app_version_already_exists'
          ? log.error(`Version ${manifest.version} already published!`)
          : Promise.reject(res))
      )
    },
  },
  settings: {
    description: 'Get app settings',
    requiredArgs: 'app',
    optionalArgs: 'field',
    handler: async (app, field) => {
      const response = await appsClient().getAppSettings(
        getAccount(), getWorkspace(), app)
      if (typeof field === 'object') {
        console.log(response)
      } else {
        console.log(jp.value(response, '$.' + field))
      }
    },

    set: {
      description: 'Set a value',
      requiredArgs: ['app', 'field', 'value'],
      handler: async (app, field, value) => {
        const patch = {}
        jp.value(patch, '$.' + field, value)
        const response = await appsClient().patchAppSettings(
          getAccount(), getWorkspace(), app, patch)
        console.log(response)
      },
    },

    unset: {
      description: 'Unset a value',
      requiredArgs: ['app', 'field'],
      handler: async (app, field) => {
        const patch = {}
        jp.value(patch, '$.' + field, null)
        const response = await appsClient().patchAppSettings(
          getAccount(), getWorkspace(), app, patch)
        console.log(response)
      },
    },
  },
}
