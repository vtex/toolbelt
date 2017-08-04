import {head, tail} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {validateAppAction} from './utils'
import {listenBuild} from '../utils'
import {getManifest, validateApp} from '../../manifest'

const {unlink} = apps
const ARGS_START_INDEX = 2

const unlinkApps = async (apps: string[]): Promise<void> => {
  if (apps.length === 0) {
    return
  }
  const app = validateApp(head(apps))
  try {
    log.debug('Starting to install app', app)
    await unlink(app)
  } catch (e) {
    if (e.statusCode === 409) {
      log.warn(`App ${app} is currently not linked`)
    } else {
      log.warn(`The following apps were not unlinked: ${apps.join(', ')}`)
      throw e
    }
  }
  log.info(`Unlinked app ${app} successfully`)
  await unlinkApps(tail(apps))
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
    const manifest = await getManifest()
  const app = optionalApp || `${manifest.vendor}.${manifest.name}@${manifest.version}`
  const apps = [app, ...options._.slice(ARGS_START_INDEX)].map(arg => arg.toString())

  const doUnlink = () => unlinkApps(apps)
  log.debug('Unlinking app(s)', apps)
  // Only listen for feedback if there's only one app
  return apps.length === 1
    ? listenBuild(app, doUnlink)
    : doUnlink()
}
