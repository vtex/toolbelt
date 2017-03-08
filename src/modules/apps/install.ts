import {head, tail} from 'ramda'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {workspaceMasterMessage} from './utils'
import {manifest, namePattern, vendorPattern} from '../../manifest'

const {installApp} = apps
const ARGS_START_INDEX = 2

const appIdValidator = (app: string): Bluebird<void | never> => {
  const appRegex = new RegExp(`^${vendorPattern}.${namePattern}@.+$`)
  return Promise.resolve(appRegex.test(app))
    .then((isAppValid: boolean) => {
      if (isAppValid) {
        return
      }
      log.error('Invalid app format, please use <vendor>.<name>[@<version>]')
      throw new Error()
    })
}

const installApps = (apps: string[]): Bluebird<void | never> => {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to install app', app)
  return appIdValidator(app)
    .then(() => installApp(app))
    .tap(() => log.info(`Installed app ${app} successfully`))
    .then(() => decApp.length > 0 ? installApps(decApp) : Promise.resolve())
    .catch(err => {
      if (apps.length > 1 && !err.toolbeltWarning) {
        log.warn(`The following apps were not installed: ${apps.join(', ')}`)
        err.toolbeltWarning = true
      }
    })
}

export default {
  optionalArgs: 'app',
  description: 'Install an app on the current directory or a specified one',
  handler: (optionalApp: string, options) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }
    const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)]
    log.debug('Installing app(s)', apps)
    return installApps(apps)
  },
}
