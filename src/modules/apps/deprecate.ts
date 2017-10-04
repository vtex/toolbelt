import {head, tail, prepend} from 'ramda'

import log from '../../logger'
import {parseArgs} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator, parseLocator} from './../../locator'
import {createClients} from '../../clients'
import {getAccount} from '../../conf'

const deprecateApps = async (appsList: string[], registry): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = await validateApp(head(appsList))
  const {vendor, name, version} = parseLocator(app)
  try {
    log.debug('Starting to deprecate app:', app)
    await registry.deprecateApp(`${vendor}.${name}`, version)
    log.info('Successfully deprecated', app)
  } catch (e) {
    log.error(`Error deprecating ${app}. ${e.message}. ${e.response.statusText}`)
  }
  await deprecateApps(tail(appsList), registry)
}

export default async (optionalApp: string, options) => {
  const optionRegistry = options ? (options.r || options.registry) : null
  const context = {account: optionRegistry || getAccount(), workspace: 'master'}
  const {registry} = createClients(context)
  const appsList = prepend(optionalApp || toAppLocator(await getManifest()), parseArgs(options._))
  log.debug('Deprecating app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return deprecateApps(appsList, registry)
}
