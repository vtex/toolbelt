import chalk from 'chalk'

import { apps } from '../../clients'
import log from '../../utils/logger'
import { promptConfirm } from '../../utils/prompts'
import { validateAppAction } from '../../utils/utils'
import { ManifestValidator } from '../../utils/manifest/ManifestValidator'
import { ManifestEditor } from '../../utils/manifest/ManifestEditor'
import { getAccount, getWorkspace } from '../../utils/conf'
import { UserCancelledError } from '../../utils/errors'

const { uninstallApp } = apps

const promptAppUninstall = (appsList: string[]): Promise<void> =>
  promptConfirm(
    `Are you sure you want to uninstall ${appsList.join(', ')} from account ${chalk.blue(
      getAccount()
    )}, workspace ${chalk.green(getWorkspace())}?`
  ).then(answer => {
    if (!answer) {
      throw new UserCancelledError()
    }
  })

const uninstallApps = async (appsList: string[]): Promise<void> => {
  for (const app of appsList) {
    const appName = ManifestValidator.validateApp(app.split('@')[0], true)
    try {
      log.debug('Starting to uninstall app', appName)
      // eslint-disable-next-line no-await-in-loop
      await uninstallApp(appName)
      log.info(`Uninstalled app ${appName} successfully`)
    } catch (e) {
      log.warn(`The following app was not uninstalled: ${appName}`)
      log.error(`${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
    }
  }
}

export async function appsUninstall(optionalApp, preConfirm) {
  await validateAppAction('uninstall', optionalApp)
  const app = optionalApp || (await ManifestEditor.getManifestEditor()).appLocator
  const appsList = [app]

  if (!preConfirm) {
    await promptAppUninstall(appsList)
  }

  log.debug(`Uninstalling app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
  return uninstallApps(appsList)
}
