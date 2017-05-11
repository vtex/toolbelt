import {head, tail} from 'ramda'
import * as Bluebird from 'bluebird'

import {CommandError} from '../../errors'
import log from '../../logger'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {workspaceMasterMessage} from './utils'
import {vendorPattern, namePattern, manifest, isManifestReadable} from '../../manifest'

const {unlink} = apps
const ARGS_START_INDEX = 2

const appIdValidator = (app: string): Bluebird<void | never> => {
  const appRegex = new RegExp(`^${vendorPattern}\\.${namePattern}@.+$`)
  return Promise.resolve(appRegex.test(app))
    .then((isAppValid: boolean) => {
      if (isAppValid) {
        return
      }
      throw new CommandError('Invalid app format, please use <vendor>.<name>[@<version>]')
    })
}

const unlinkApps = (apps: string[]): Bluebird<void | never> => {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to unlink app', app)
  return appIdValidator(app)
    .then(() => unlink(app))
    .tap(() => log.info(`Unlinked app ${app} successfully`))
    .then(() => decApp.length > 0 ? unlinkApps(decApp) : Promise.resolve())
    .catch(err => {
      if (err.statusCode === 409) {
        return log.error(`App ${app} not linked`)
      }
      // A warn message will display the workspaces not deleted.
      if (!err.toolbeltWarning) {
        log.warn(`The following apps were not unlinked: ${apps.join(', ')}`)
        // the warn message is only displayed the first time the err occurs.
        err.toolbeltWarning = true;
      }
      throw err
    })
}

export default {
  optionalArgs: 'app',
  description: 'Unlink an app on the current directory or a specified one',
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

    const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
    log.debug('Unlinking app(s)', apps)
    return unlinkApps(apps)
  },
}
