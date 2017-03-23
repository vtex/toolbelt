import {head, tail} from 'ramda'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {manifest} from '../../manifest'
import {workspaceMasterMessage} from './utils'

const {unlink} = apps
const ARGS_START_INDEX = 2

const unlinkApps = (apps: string[]): Bluebird<void | never> => {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to unlink app', app)
  return unlink(app)
    .tap(() => log.info(`Unlinked app ${app} successfully`))
    .then(() => decApp.length > 0 ? unlinkApps(decApp) : Promise.resolve())
    .catch(err => {
      if (err.statusCode === 409) {
        return log.error(`App ${app} not linked`)
      }
      if (apps.length > 1 && !err.toolbeltWarning) {
        log.warn(`The following apps were not unlinked: ${apps.join(', ')}`)
        err.toolbeltWarning = true
      }
      return Promise.reject(err)
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
    const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)]
    log.debug('Unlinking app(s)', apps)
    return unlinkApps(apps)
  },
}
