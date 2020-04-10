import { apps } from '../clients'
import log from '../utils/logger'
import { validateAppAction } from '../utils/utils'
import { ManifestValidator } from '../utils/manifest/ManifestValidator'
import { ManifestEditor } from '../utils/manifest/ManifestEditor'

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
      if (e?.response?.data?.message) {
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
    if (e?.response?.data?.message) {
      log.error(e.response.data.message)
    }
  }
}

export async function appsUnlink(optionalApp, all) {
  const linkedApps = await listLinks()
  if (linkedApps.length === 0) {
    return log.info('No linked apps?')
  }

  if (all) {
    return unlinkAllApps()
  }

  const app = optionalApp || (await ManifestEditor.getManifestEditor()).appLocator
  const appsList = [app]
  return unlinkApps(appsList)
}
