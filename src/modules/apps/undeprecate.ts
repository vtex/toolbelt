import chalk from 'chalk'
import { createClients } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import { ManifestEditor, ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import switchAccount from '../auth/switch'
import { promptConfirm } from '../prompts'
import { parseLocator } from '../../locator'
import { parseArgs, switchAccountMessage } from './utils'

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

const promptUndeprecateOnVendor = (msg: string) => promptConfirm(msg)

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptUndeprecateOnVendor(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      await switchAccount(previousAccount, { workspace: previousWorkspace })
    }
  }
}

const undeprecateApp = async (app: string): Promise<void> => {
  const { vendor, name, version } = parseLocator(app)
  const account = getAccount()
  if (vendor !== account) {
    const canSwitchToVendor = await promptUndeprecateOnVendor(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      throw new UserCancelledError()
    }
    await switchAccount(vendor, {})
  }

  const context = { account: vendor, workspace: 'master', authToken: getToken() }
  const { registry } = createClients(context)
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
        await switchToPreviousAccount(originalAccount, originalWorkspace)
        return
      } else {
        // eslint-disable-next-line no-await-in-loop
        await switchToPreviousAccount(originalAccount, originalWorkspace)
        throw e
      }
    }
  }
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  originalAccount = getAccount()
  originalWorkspace = getWorkspace()
  const appsList = [optionalApp || (await ManifestEditor.getManifestEditor()).appLocator, ...parseArgs(options._)]

  if (!preConfirm && !(await promptUndeprecate(appsList))) {
    throw new UserCancelledError()
  }
  log.debug(`Undeprecating app ${appsList.length > 1 ? 's' : ''} : ${appsList.join(', ')}`)
  return prepareUndeprecate(appsList)
}
