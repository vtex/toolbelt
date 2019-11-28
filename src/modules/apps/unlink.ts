import { path } from 'ramda'
import { apps } from '../../clients'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { parseArgs, validateAppAction } from './utils'

const { unlink, unlinkAll, listLinks } = apps

const unlinkApp = async (app: string) => {
  ManifestValidator.validateApp(app)

  try {
    log.info('Starting to unlink app:', app)
    await unlink(app)
    log.info('Successfully unlinked', app)
  } catch (e) {
    if (e.response.status === 404) {
      log.error(`${app} is not linked in the current workspace. \
Make sure you typed the right app vendor, name and version.`)
    } else {
      log.error(`Error unlinking ${app}.`, e.message)
      if (path(['response', 'data', 'message'], e)) {
        log.error(e.response.data.message)
      }
    }
  }
}

const unlinkApps = async (appsList: string[]): Promise<void> => {
  await validateAppAction('unlink', appsList)
  await Promise.all(appsList.map(unlinkApp))
}

const unlinkAllApps = async (): Promise<void> => {
  try {
    log.info('Starting to unlink all apps')
    await unlinkAll()
    log.info('Successfully unlinked all apps')
  } catch (e) {
    log.error('Error unlinking all apps.', e.message)
    if (path(['response', 'data', 'message'], e)) {
      log.error(e.response.data.message)
    }
  }
}

export default async (optionalApp: string, options) => {
  const linkedApps = await listLinks()
  if (linkedApps.length === 0) {
    return log.info('No linked apps?')
  }

  if (options.a || options.all) {
    return unlinkAllApps()
  }

  const manifest = new ManifestEditor()
  const app = optionalApp || manifest.appLocator
  const appsList = [app, ...parseArgs(options._)]
  return unlinkApps(appsList)
}
