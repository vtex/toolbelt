import {head, tail, contains} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction} from './utils'
import {listenBuild} from '../utils'
import {getManifest, validateApp} from '../../manifest'
import {toMajorLocator, parseLocator} from './../../locator'

const {unlink, listLinks} = apps
const ARGS_START_INDEX = 1

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
    appsList = [optionalApp || toMajorLocator(await getManifest()), ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())
    await validateAppAction(appsList)
  }
  if (appsList.length === 1) {
    appsList = toMajorLocator(parseLocator(appsList[0]))
    validateApp(appsList)
    if (contains(appsList, linkedApps.toString())) {
      return listenBuild(appsList, () => unlinkApps([appsList])) // Only listen for feedback if there's only one app
    } else {
      return log.info('App not linked')
    }
  } else {
    log.debug('Starting to unlink apps:', appsList.join(', '))
    return unlinkApps(appsList)
  }
}
