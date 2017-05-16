import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {prop, head, tail} from 'ramda'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {workspaceMasterMessage} from './utils'
import {manifest, vendorPattern, namePattern, isManifestReadable} from '../../manifest'

const {uninstallApp} = apps
const ARGS_START_INDEX = 2

const promptAppUninstall = (apps: string[]): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to uninstall the apps ${apps.join(', ')}?`,
    }),
  )
  .then<boolean>(prop('confirm'))

const appIdValidator = (app: string): Bluebird<void | never> => {
  const appRegex = new RegExp(`^${vendorPattern}\\.${namePattern}$`)
  return Promise.resolve(appRegex.test(app))
    .then((isAppValid: boolean) => {
      if (isAppValid) {
        return
      }
      throw new CommandError('Invalid app format, please use <vendor>.<name>')
    })
}

const uninstallApps = (apps: string[], preConfirm: boolean): Bluebird<void | never> => {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to uninstall app', app)
  return appIdValidator(app)
    .then(() => uninstallApp(app))
    .tap(() => log.info(`Uninstalled app ${app} successfully`))
    .then(() =>
      decApp.length > 0 ? uninstallApps(decApp, preConfirm) : Promise.resolve(),
    )
    .catch(err => {
       // A warn message will display the workspaces not deleted.
      if (!err.toolbeltWarning) {
        log.warn(`The following apps were not uninstalled: ${apps.join(', ')}`)
        // the warn message is only displayed the first time the err occurs.
        err.toolbeltWarning = true
      }
      throw err
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
  handler: (optionalApp: string, options) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    // No app arguments and no manifest file.
    if (!optionalApp && !isManifestReadable()) {
      throw new CommandError('No app was found, please fix the manifest.json or use <vendor>.<name>[@<version>]')
    }

    const app = optionalApp || `${manifest.vendor}.${manifest.name}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
    const preConfirm = options.y || options.yes
    log.debug('Uninstalling app(s)', apps)
    return Promise.resolve(preConfirm || promptAppUninstall(apps))
      .then(confirm => confirm || Promise.reject(new Error('User cancelled')))
      .then(() => uninstallApps(apps, preConfirm))
      .catch(err => {
        if (err.message === 'User cancelled') {
          log.error(err.message)
          return Promise.resolve()
        }
        return Promise.reject(err)
      })
  },
}
