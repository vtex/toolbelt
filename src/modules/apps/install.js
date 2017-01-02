import log from '../../logger'
import {head, tail} from 'ramda'
import courier from '../../courier'
import {clearAbove} from '../../terminal'
import {workspaceMasterMessage, installApp} from './utils'
import {getAccount, getWorkspace, getToken} from '../../conf'
import {startSpinner, setSpinnerText, stopSpinnerForced} from '../../spinner'
import {
  manifest,
  namePattern,
  vendorPattern,
  wildVersionPattern,
} from '../../manifest'

let isSuccesful = true
const ARGS_START_INDEX = 2
const invalidAppMessage = 'Invalid app format, please use <vendor>.<name>@<version>'

class InterruptionException extends Error {}

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
    if (isSuccesful) {
      apps.forEach(app => log.info(`Installed app ${app} successfully`))
    }
    process.exit()
  }
}

function installApps (apps) {
  const app = head(apps)
  const decApps = tail(apps)
  log.debug('Starting to install app', app)
  const appRegex = new RegExp(`^${vendorPattern}\\.${namePattern}@${wildVersionPattern}$`)
  let appPromise = appRegex.test(app)
    ? installApp(app)
    : Promise.reject(new InterruptionException(invalidAppMessage))

  if (log.level === 'info') {
    setSpinnerText(`Installing app ${app}`)
  }
  startSpinner()

  return appPromise
  .then(() =>
    decApps.length > 0
      ? installApps(decApps)
      : Promise.resolve()
  )
  .catch(err => {
    stopSpinnerForced()
    if (err.statusCode === 409) {
      return log.error(`App ${app} already installed`)
    }
    if (apps.length > 0 && !err.toolbeltWarning) {
      log.warn(`The following apps were not installed: ${apps.join(', ')}`)
      err.toolbeltWarning = true
    }
    return Promise.reject(err)
  })
}

export default {
  optionalArgs: 'app',
  description: 'Install an app on the current directory or a specified set of apps',
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
    .catch(err => {
      isSuccesful = false
      if (err instanceof InterruptionException) {
        log.error(err.message)
        return Promise.resolve()
      }
      return Promise.reject(err)
    })
  },
}
