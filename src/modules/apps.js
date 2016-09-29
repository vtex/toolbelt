import chalk from 'chalk'
import jp from 'jsonpath'
import log from '../logger'
import moment from 'moment'
import Table from 'cli-table'
import inquirer from 'inquirer'
import debounce from 'debounce'
import {Promise} from 'bluebird'
import courier from '../courier'
import {uniqBy, prop} from 'ramda'
import userAgent from '../user-agent'
import {createInterface} from 'readline'
import {allocateChangeLog} from '../apps'
import {timeStart, timeEnd} from '../time'
import {getWorkspaceURL} from '../workspace'
import {AppsClient, RegistryClient} from '@vtex/api'
import {getToken, getAccount, getWorkspace} from '../conf'
import {setSpinnerText, startSpinner, stopSpinner} from '../spinner'
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

const KEEP_ALIVE_INTERVAL = 5000

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
      setSpinnerText('Sending changes')
      startSpinner()
      timeStart()
      return registryClient().publishAppPatch(
        account,
        workspace,
        vendor,
        name,
        version,
        queue
      )
      .then(() => installApp(`${vendor}.${name}@${version}+rc`))
      .then(() => allocateChangeLog(queue, moment().format('HH:mm:ss')))
      .then(() => { queue = [] })
      .catch(err => {
        timeEnd()
        stopSpinner()
        return Promise.reject(err)
      })
    },
    200
  )
  return changes => {
    if (changes.length === 0) {
      return
    }
    queue = uniqBy(pathProp, queue.concat(changes).reverse())
    return publishPatch(getAccount(), getWorkspace(), manifest.vendor, manifest.name, manifest.version)
  }
})()

const keepAppAlive = () => {
  let exitPromise
  const rcApp = `${id}+rc`
  return installApp(rcApp)
  .then(() => {
    const keepAliveInterval = setInterval(() => {
      appsClient().updateAppTtl(
        getAccount(),
        getWorkspace(),
        id,
      )
    }, KEEP_ALIVE_INTERVAL)
    createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', () => {
      if (exitPromise) {
        return
      }
      stopSpinner()
      clearTimeout(keepAliveInterval)
      log.info('Exiting...')
      exitPromise = appsClient().uninstallApp(getAccount(), getWorkspace(), rcApp)
      .finally(() => process.exit())
    })
  })
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

const promptAppUninstall = (app) => {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to uninstall the app ${app}?`,
  })
  .then(({confirm}) => confirm)
}

const workspaceMasterMessage = `${chalk.green('master')} is ${chalk.red('read-only')}, please use another workspace`

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
      const workspace = getWorkspace()
      if (workspace === 'master') {
        log.error(workspaceMasterMessage)
        return Promise.resolve()
      }

      const account = getAccount()
      log.info('Watching app', `${id}`)
      console.log(
        chalk.green('Your URL:'),
        chalk.blue(getWorkspaceURL(account, workspace))
      )
      courier.listen(account, workspace, getToken())
      if (log.level === 'info') {
        setSpinnerText('Sending files')
        startSpinner()
      }
      let tempPath
      log.debug('Creating temp path...')

      return createTempPath(id).then(t => { tempPath = t })
      .tap(() => log.debug('Listing local files...'))
      .then(() => listLocalFiles(root))
      .then(files => compressFiles(files, tempPath))
      .tap(() => log.debug('Publishing app...'))
      .then(({file}) => publishApp(file, true))
      .tap(() => log.debug('Deleting temp file...'))
      .then(() => deleteTempFile(tempPath))
      .then(keepAppAlive)
      .tap(() => log.debug('Starting watch...'))
      .then(() => watch(root, sendChanges))
      .catch(err => {
        stopSpinner()
        return Promise.reject(err)
      })
    },
  },
  install: {
    requiredArgs: 'app',
    alias: 'i',
    description: 'Install the specified app',
    handler: (app) => {
      const workspace = getWorkspace()
      if (workspace === 'master') {
        log.error(workspaceMasterMessage)
        return Promise.resolve()
      }

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
    options: [
      {
        short: 'y',
        long: 'yes',
        description: 'Auto confirm prompts',
        type: 'boolean',
      },
    ],
    handler: (app, options) => {
      const workspace = getWorkspace()
      if (workspace === 'master') {
        log.error(workspaceMasterMessage)
        return Promise.resolve()
      }

      log.debug('Starting to uninstall app', app)
      const appRegex = new RegExp(`^${vendorPattern}\.${namePattern}$`)
      if (!appRegex.test(app)) {
        log.error('Invalid app format, please use <vendor>.<name>')
        return Promise.resolve()
      }

      const preConfirm = options.y || options.yes
      return Promise.try(() => preConfirm || promptAppUninstall(app))
      .then(confirm => confirm || Promise.reject('User cancelled'))
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
      const workspace = getWorkspace()
      if (workspace === 'master') {
        log.error(workspaceMasterMessage)
        return Promise.resolve()
      }

      log.debug('Starting to publish app')
      setSpinnerText('Publishing app...')
      startSpinner()

      return createTempPath(id).then(tempPath =>
        listLocalFiles(root)
        .then(files => compressFiles(files, tempPath))
        .then(({file}) => publishApp(file))
        .then(() => deleteTempFile(tempPath))
        .finally(() => stopSpinner())
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
        const workspace = getWorkspace()
        if (workspace === 'master') {
          log.error(workspaceMasterMessage)
          return Promise.resolve()
        }

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
        const workspace = getWorkspace()
        if (workspace === 'master') {
          log.error(workspaceMasterMessage)
          return Promise.resolve()
        }

        const patch = {}
        jp.value(patch, '$.' + field, null)
        const response = await appsClient().patchAppSettings(
          getAccount(), getWorkspace(), app, patch)
        console.log(response)
      },
    },
  },
}
