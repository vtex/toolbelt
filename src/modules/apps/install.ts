import {head, tail} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {listenUntilBuildSuccess, validateAppAction} from './utils'
import {manifest, validateApp} from '../../manifest'

const {installApp} = apps
const ARGS_START_INDEX = 2

const installApps = async (apps: string[], reg: string): Promise<void> => {
  if (apps.length === 0) {
    return
  }
  const app = validateApp(head(apps))

  try {
    log.debug('Starting to install app', app)
    await installApp(app, reg)
  } catch (e) {
    log.warn(`The following apps were not installed: ${apps.join(', ')}`)
    throw e
  }
  log.info(`Installed app ${app} successfully`)
  await installApps(tail(apps), reg)
}

export default {
  optionalArgs: 'app',
  description: 'Install an app (defaults to the app in the current directory)',
  options: [
    {
      short: 'r',
      long: 'registry',
      description: 'Specify the registry for the app',
      type: 'string',
    },
  ],
  handler: async (optionalApp: string, options) => {
    await validateAppAction(optionalApp)
    const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
    const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())

    // Only listen for feedback if there's only one app
    if (apps.length === 1) {
      listenUntilBuildSuccess(app)
    }

    log.debug('Installing app(s)', apps)
    return installApps(apps, options.r || options.registry || 'smartcheckout')
  },
}
