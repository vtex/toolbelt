import {head, tail, contains, prepend} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction, parseArgs} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toMajorLocator, parseLocator} from './../../locator'

const {unlink, listLinks} = apps

const unlinkApps = async (appsList: string[]): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = validateApp(head(appsList))
  const unlinkApp = async () => {
    log.info('Starting to unlink app:', app)
    await unlink(app)
    log.info('Successfully unlinked', app)
  }
  try {
    await Promise.all([unlinkApp(), unlinkApps(tail(appsList))])
  } catch (e) {
    log.error(`Error unlinking ${app}.`, e.message)
  }
}

export default async (optionalApp: string, options) => {
  let appsList
  const linkedApps = await listLinks()
  if (linkedApps.length === 0) {
    return log.info('No linked apps')
  }
  if (options.a || options.all) {
    appsList = linkedApps
    await validateAppAction(appsList)
  } else {
    appsList = prepend(optionalApp || toMajorLocator(await getManifest()), parseArgs(options._))
    await validateAppAction(appsList)
  }
  log.debug('Starting to unlink apps:', appsList.join(', '))
  return unlinkApps(appsList)
}
