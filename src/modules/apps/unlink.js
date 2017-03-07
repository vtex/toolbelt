import log from '../../logger'
import {head, tail} from 'ramda'
import {workspaceMasterMessage} from './utils'
import {apps} from '../../clients'
const {unlink} = apps
import {getWorkspace} from '../../conf'
import {manifest} from '../../manifest'

const ARGS_START_INDEX = 2

function unlinkApps (apps) {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to unlink app', app)

  return unlink(app)
  .tap(() => log.info(`Unlinked app ${app} successfully`))
  .then(() =>
    decApp.length > 0
      ? unlinkApps(decApp)
      : Promise.resolve()
  )
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
  handler: (optionalApp, options) => {
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
