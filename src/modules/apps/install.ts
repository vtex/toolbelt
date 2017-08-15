import {head, tail} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

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

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())

  log.debug('Installing app(s)', apps)
  return installApps(apps, options.r || options.registry || 'smartcheckout')
}
