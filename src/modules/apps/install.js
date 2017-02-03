import log from '../../logger'
import courier from '../../courier'
import {clearAbove} from '../../terminal'
import {workspaceMasterMessage} from './utils'
import {apps} from '../../clients'
import {getAccount, getWorkspace, getToken} from '../../conf'
import {startSpinner, setSpinnerText, stopSpinnerForced} from '../../spinner'
import {
  manifest,
  namePattern,
  vendorPattern,
} from '../../manifest'

const ARGS_START_INDEX = 2
const appsClient = apps

function defaultTag (app) {
  return app.indexOf('@') < 0 ? `${app}@latest` : app
}

function courierCallback (apps) {
  let counter = 0
  return () => {
    clearAbove()
    const app = apps[counter]
    counter += 1
    log.info(`Installed app ${app} successfully`)
    if (counter === apps.length) {
      process.exit()
    }
  }
}

function courierAction (apps) {
  return () => {
    stopSpinnerForced()
    apps.forEach(message => log.info(message))
    process.exit()
  }
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

  if (log.level === 'info') {
    setSpinnerText(`Installing app ${app}`)
  }
  startSpinner()

  return appsClient().installApp(app)
  .then(({message}) => (apps[accessor] = message))
  .then(() =>
    nextAccessor < apps.length
      ? installApps(apps, nextAccessor)
      : Promise.resolve()
  )
  .catch(err => {
    stopSpinnerForced()
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
    courier.listen(getAccount(), workspace, getToken(), {
      origin: apps,
      callback: courierCallback(apps),
      timeout: {
        duration: 6000,
        action: courierAction(apps),
      },
    })
    log.debug('Installing app(s)', apps)
    return installApps(apps)
  },
}
