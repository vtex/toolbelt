import chalk from 'chalk'

import { getAccount, getToken, getWorkspace } from '../../utils/conf'
import { switchAccount } from '../auth/switch'
import { parseLocator } from '../../utils/locator'
import { UserCancelledError } from '../../utils/errors'
import { createClients } from '../../clients'
import log from '../../utils/logger'
import { promptConfirm } from '../../utils/prompts'
import { switchAccountMessage } from '../../utils/utils'
import { ManifestValidator } from '../../utils/manifest/ManifestValidator'
import { ManifestEditor } from '../../utils/manifest/ManifestEditor'

let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deprecate this app in an account that differs from the indicated vendor. Do you want to deprecate in account ${chalk.blue(
    vendor
  )}?`
}

const promptDeprecate = (appsList: string[]) =>
  promptConfirm(
    `Are you sure you want to deprecate app${appsList.length > 1 ? 's' : ''} ${chalk.green(appsList.join(', '))}?`
  )

const promptDeprecateOnVendor = (msg: string) => promptConfirm(msg)

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptDeprecateOnVendor(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      return switchAccount(previousAccount, { workspace: previousWorkspace })
    }
  }
}

const deprecateApp = async (app: string): Promise<void> => {
  const { vendor, name, version } = parseLocator(app)
  const account = getAccount()
  if (vendor !== account) {
    const canSwitchToVendor = await promptDeprecateOnVendor(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      throw new UserCancelledError()
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: getToken() }
  const { registry } = createClients(context)
  return registry.deprecateApp(`${vendor}.${name}`, version)
}

const prepareAndDeprecateApps = async (appsList: string[]): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    log.debug('Starting to deprecate app:', app)

    try {
      // eslint-disable-next-line no-await-in-loop
      await deprecateApp(app)
      log.info('Successfully deprecated', app)
    } catch (e) {
      if (e.response && e.response.status && e.response.status === 404) {
        log.error(`Error deprecating ${app}. App not found`)
      } else if (e.message && e.response.statusText) {
        log.error(`Error deprecating ${app}. ${e.message}. ${e.response.statusText}`)
        return switchToPreviousAccount(originalAccount, originalWorkspace)
      } else {
        // eslint-disable-next-line no-await-in-loop
        await switchToPreviousAccount(originalAccount, originalWorkspace)
        throw e
      }
    }
  }

  await switchToPreviousAccount(originalAccount, originalWorkspace)
}

export async function appsDeprecate(optionalApp: string, preConfirm: boolean) {
  originalAccount = getAccount()
  originalWorkspace = getWorkspace()
  const appsList = [optionalApp || (await ManifestEditor.getManifestEditor()).appLocator]

  if (!preConfirm && !(await promptDeprecate(appsList))) {
    throw new UserCancelledError()
  }

  log.debug(`Deprecating app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
  return prepareAndDeprecateApps(appsList)
}
