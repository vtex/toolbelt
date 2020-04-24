import chalk from 'chalk'
import { apps } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import { validateAppAction } from './utils'

const { uninstallApp } = apps

const promptAppUninstall = (appsList: string[]): Promise<boolean> =>
  promptConfirm(
    `Are you sure you want to uninstall ${appsList.join(', ')} from account ${chalk.blue(
      getAccount()
    )}, workspace ${chalk.green(getWorkspace())}?`
  )

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

export default async (optionalApps: string[], options) => {
  await validateAppAction('uninstall', optionalApps)
  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]
  const preConfirm = options.y || options.yes
  let promptAnswer

  if (!preConfirm) {
    promptAnswer = await promptAppUninstall(appsList)
  }

  if (promptAnswer) {
    log.debug(`Uninstalling app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
    return uninstallApps(appsList)
  }
}
