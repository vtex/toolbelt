import log from '../../logger'
import {workspaceMasterMessage} from './utils'
import {apps} from '../../clients'
import {getWorkspace} from '../../conf'
import {
  manifest,
  namePattern,
  vendorPattern,
} from '../../manifest'

const ARGS_START_INDEX = 2
const {installApp} = apps

function defaultTag (app) {
  return app.indexOf('@') < 0 ? `${app}@latest` : app
}

function installApps (apps, accessor = 0) {
  const app = defaultTag(apps[accessor])
  const nextAccessor = accessor + 1
  log.debug('Starting to install app', app)
  const appRegex = new RegExp(`^${vendorPattern}.${namePattern}@.+$`)
  if (!appRegex.test(app)) {
    log.error('Invalid app format, please use <vendor>.<name>[@<version>]')
    return Promise.resolve()
  }

  return installApp(app)
  .then(({message}) => (apps[accessor] = message))
  .tap(() => log.info(`Installed app ${app} successfully`))
  .then(() =>
    nextAccessor < apps.length
      ? installApps(apps, nextAccessor)
      : Promise.resolve()
  )
  .catch(err => {
    if (err.statusCode === 409) {
      return log.error(`App ${app} already installed`)
    }
    if (apps.length > 1 && !err.toolbeltWarning) {
      log.warn(`The following apps were not installed: ${apps.join(', ')}`)
      err.toolbeltWarning = true
    }
    return Promise.reject(err)
  })
}

export default {
  optionalArgs: 'app',
  description: 'Install an app on the current directory or a specified one',
  handler: (optionalApp, options) => {
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
