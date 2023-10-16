import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import log from '../../api/logger'
import { validateAppAction } from '../../api/modules/utils'

const { unlink, unlinkAll, listLinks } = createAppsClient()

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
    process.exit(1);
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
    process.exit(1);
  }
}

export default async (optionalApps: string[], options) => {
  const linkedApps = await listLinks()
  if (linkedApps.length === 0) {
    return log.info('No linked apps?')
  }

  if (options.a || options.all) {
    return unlinkAllApps()
  }

  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]
  return unlinkApps(appsList)
}
