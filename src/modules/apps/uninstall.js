import log from '../../logger'
import inquirer from 'inquirer'
import {head, tail} from 'ramda'
import {workspaceMasterMessage} from './utils'
import {getWorkspace} from '../../conf'
import {manifest, vendorPattern, namePattern} from '../../manifest'
import {apps} from '../../clients'
const {uninstallApp} = apps

const ARGS_START_INDEX = 2
const promptAppUninstall = (apps) => {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to uninstall the apps ${apps.join(', ')}?`,
  })
  .then(({confirm}) => confirm)
}

function uninstallApps (apps, preConfirm) {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to uninstall app', app)
  const appRegex = new RegExp(`^${vendorPattern}.${namePattern}$`)
  if (!appRegex.test(app)) {
    log.error('Invalid app format, please use <vendor>.<name>')
    return Promise.resolve()
  }

  return uninstallApp(app)
  .tap(() => log.info(`Uninstalled app ${app} successfully`))
  .then(() =>
    decApp.length > 0
      ? uninstallApps(decApp, preConfirm)
      : Promise.resolve()
  )
  .catch(err => {
    if (err.statusCode === 409) {
      return log.error(`App ${app} not installed`)
    }
    if (apps.length > 1 && !err.toolbeltWarning) {
      log.warn(`The following apps were not uninstalled: ${apps.join(', ')}`)
      err.toolbeltWarning = true
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

    const app = optionalApp || `${manifest.vendor}.${manifest.name}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)]
    const preConfirm = options.y || options.yes
    log.debug('Uninstalling app(s)', apps)
    return Promise.try(() => preConfirm || promptAppUninstall(apps))
    .then(confirm => confirm || Promise.reject('User cancelled'))
    .then(() => uninstallApps(apps, preConfirm))
  },
}
