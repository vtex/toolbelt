import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import { createClients } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import { ManifestValidator } from '../../lib/manifest'
import log from '../../logger'
import { getManifest } from '../../manifest'
import switchAccount from '../auth/switch'
import { promptConfirm } from '../prompts'
import { parseLocator, toAppLocator } from './../../locator'
import { switchAccountMessage } from './utils'

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deploy this app in an account that differs from the indicated vendor. Do you want to deploy in account ${chalk.blue(
    vendor
  )}?`
}

const promptValidate = (app: string): Bluebird<boolean> => promptConfirm(`Are you sure you want to deploy app ${app}`)

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptConfirm(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      return await switchAccount(previousAccount, { workspace: previousWorkspace })
    }
  }
  return
}

const deployRelease = async (app: string): Promise<void> => {
  const { vendor, name, version } = parseLocator(app)
  const account = getAccount()
  if (vendor !== account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      throw new UserCancelledError()
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: getToken() }
  const { registry } = createClients(context)
  return await registry.validateApp(`${vendor}.${name}`, version)
}

const prepareValidate = async (app, originalAccount, originalWorkspace: string): Promise<void> => {
  app = await ManifestValidator.validateApp(app)
  try {
    log.debug('Starting to deploy app:', app)
    await deployRelease(app)
    log.info('Successfully deployed', app)
  } catch (e) {
    if (e?.response?.status === 404) {
      log.error(`Error deploying ${app}. App not found or already deployed`)
    } else if (e.message && e.response.statusText) {
      log.error(`Error deploying ${app}. ${e.message}. ${e.response.statusText}`)
      return await switchToPreviousAccount(originalAccount, originalWorkspace)
    } else {
      await switchToPreviousAccount(originalAccount, originalWorkspace)
      throw e
    }
  }
  await switchToPreviousAccount(originalAccount, originalWorkspace)
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  const originalAccount = getAccount()
  const originalWorkspace = getWorkspace()
  const app = optionalApp || toAppLocator(await getManifest())

  if (!preConfirm && !(await promptValidate(app))) {
    throw new UserCancelledError()
  }
  log.debug(`Deploying app ${app}`)
  return prepareValidate(app, originalAccount, originalWorkspace)
}
