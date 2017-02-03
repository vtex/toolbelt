import log from '../../logger'
import {head, tail} from 'ramda'
import courier from '../../courier'
import {createInterface} from 'readline'
import {clearAbove} from '../../terminal'
import {workspaceMasterMessage} from './utils'
import {apps} from '../../clients'
import {getWorkspace, getAccount, getToken} from '../../conf'
import {manifest, vendorPattern, namePattern, wildVersionPattern} from '../../manifest'
import {startSpinner, setSpinnerText, stopSpinnerForced} from '../../spinner'

const ARGS_START_INDEX = 2
const appsClient = apps

function courierCallback (apps) {
  let counter = 0
  return () => {
    clearAbove()
    const app = apps[counter]
    counter += 1
    log.info(`Unlinked app ${app} successfully`)
    if (counter === apps.length) {
      process.exit()
    }
  }
}

function courierAction (apps) {
  return () => {
    stopSpinnerForced()
    apps.forEach(app => log.info(`Unlinked app ${app} successfully`))
    process.exit()
  }
}

function unlinkApps (apps) {
  const app = head(apps)
  const decApp = tail(apps)
  log.debug('Starting to unlink app', app)
  const appRegex = new RegExp(`^${vendorPattern}.${namePattern}@${wildVersionPattern}$`)
  if (!appRegex.test(app)) {
    log.error('Invalid app format, please use <vendor>.<name>@<version>')
    return Promise.resolve()
  }

  if (log.level === 'info') {
    setSpinnerText(`Unlinking app ${app}`)
  }
  startSpinner()

  return appsClient().unlink(app)
  .then(() =>
    decApp.length > 0
      ? unlinkApps(decApp)
      : Promise.resolve()
  )
  .catch(err => {
    stopSpinnerForced()
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

    createInterface({input: process.stdin, output: process.stdout})
    .on('SIGINT', () => process.exit())

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
    log.debug('Unlinking app(s)', apps)
    return unlinkApps(apps)
  },
}
