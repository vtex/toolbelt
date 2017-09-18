import {head, tail, prepend} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction, parseArgs} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

const {installApp} = apps

export const installApps = async (appsList: string[], reg: string): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = validateApp(head(appsList))

  try {
    log.debug('Starting to install app', app)
    await installApp(app, reg)
    log.info(`Installed app ${app} successfully`)
  } catch (e) {
    log.warn(`The following app was not installed: ${app}`)
    log.error(`Error ${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
  }
  await installApps(tail(appsList), reg)
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const appsList = prepend(app, parseArgs(options._))
  log.debug('Installing app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return installApps(appsList, options.r || options.registry || 'smartcheckout')
}
