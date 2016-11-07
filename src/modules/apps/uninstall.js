import log from '../../logger'
import inquirer from 'inquirer'
import {getWorkspace, getAccount} from '../../conf'
import {workspaceMasterMessage, appsClient} from './utils'
import {manifest, vendorPattern, namePattern} from '../../manifest'

const ARGS_START_INDEX = 2
const promptAppUninstall = (app) => {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to uninstall the app ${app}?`,
  })
  .then(({confirm}) => confirm)
}

function uninstallApps (apps, preConfirm) {
  const app = apps.shift() || `${manifest.vendor}.${manifest.name}`
  log.debug('Starting to uninstall app', app)
  const appRegex = new RegExp(`^${vendorPattern}.${namePattern}$`)
  if (!appRegex.test(app)) {
    log.error('Invalid app format, please use <vendor>.<name>')
    return Promise.resolve()
  }

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
  .then(() =>
    apps.length > 0
      ? uninstallApps(apps, preConfirm)
      : Promise.resolve()
  )
  .catch(err => {
    if (err.statusCode === 409) {
      return log.error(`App ${app} not installed`)
    }
    return Promise.reject(err)
  })
}

export default {
  optionalArgs: 'app',
  description: 'Uninstall an app on the current directory or a specified one',
  options: [
    {
      short: 'y',
      long: 'yes',
      description: 'Auto confirm prompts',
      type: 'boolean',
    },
  ],
  handler: (optionalApp, options) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const apps = options._ ? [optionalApp, ...options._.slice(ARGS_START_INDEX)] : [optionalApp]
    const preConfirm = options.y || options.yes
    log.debug('Uninstalling app(s)', apps)
    return uninstallApps(apps, preConfirm)
  },
}
