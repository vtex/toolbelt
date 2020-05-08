import chalk from 'chalk'
import { createRegistryClient } from '../../lib/clients/IOClients/infra/Registry'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import { SessionManager } from '../../lib/session/SessionManager'
import { parseLocator } from '../../locator'
import log from '../../logger'
import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'

let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to undeprecate this app in an account that differs from the indicated vendor. Do you want to undeprecate in account ${chalk.blue(
    vendor
  )}?`
}

const promptUndeprecate = (appsList: string[]) =>
  promptConfirm(
    `Are you sure you want to undeprecate app${appsList.length > 1 ? 's' : ''} ${chalk.green(appsList.join(', '))}?`
  )

const undeprecateApp = async (app: string): Promise<void> => {
  const { vendor, name, version } = parseLocator(app)
  const { account, token } = SessionManager.getSingleton()
  if (vendor !== account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      return
    }
    await switchAccount(vendor, {})
  }

  const context = { account: vendor, workspace: 'master', authToken: token }
  const registry = createRegistryClient(context)
  return registry.undeprecateApp(`${vendor}.${name}`, version)
}

const prepareUndeprecate = async (appsList: string[]): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to undeprecate app:', app)
      // eslint-disable-next-line no-await-in-loop
      await undeprecateApp(app)
      log.info('Successfully undeprecated', app)
    } catch (e) {
      if (e.response && e.response.status && e.response.status === 404) {
        log.error(`Error undeprecating ${app}. App not found`)
      } else if (e.message && e.response.statusText) {
        log.error(`Error undeprecating ${app}. ${e.message}. ${e.response.statusText}`)
        // eslint-disable-next-line no-await-in-loop
        await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
        return
      } else {
        // eslint-disable-next-line no-await-in-loop
        await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
        throw e
      }
    }
  }
}

export default async (optionalApps: string[], options) => {
  const preConfirm = options.y || options.yes
  const { account, workspace } = SessionManager.getSingleton()
  originalAccount = account
  originalWorkspace = workspace
  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]

  if (!preConfirm && !(await promptUndeprecate(appsList))) {
    return
  }
  log.debug(`Undeprecating app ${appsList.length > 1 ? 's' : ''} : ${appsList.join(', ')}`)
  return prepareUndeprecate(appsList)
}
