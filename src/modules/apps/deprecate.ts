import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import { head, prepend, tail } from 'ramda'

import { createClients } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { getManifest, validateApp } from '../../manifest'
import switchAccount from '../auth/switch'
import { promptConfirm } from '../utils'
import { parseLocator, toAppLocator } from './../../locator'
import { parseArgs, switchAccountMessage } from './utils'

let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deprecate this app in an account that differs from the indicated vendor. Do you want to deprecate in account ${chalk.blue(vendor)}?`
}

const promptDeprecate = (appsList: string[]): Bluebird<boolean> =>
  promptConfirm(
    `Are you sure you want to deprecate app` + (appsList.length > 1 ? 's' : '') + ` ${chalk.green(appsList.join(', '))}?`
  )

const promptDeprecateOnVendor = (msg: string): Bluebird<boolean> =>
  promptConfirm(msg)

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptDeprecateOnVendor(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      return await switchAccount(previousAccount, {workspace: previousWorkspace})
    }
  }
  return
}

const deprecateApp = async (app: string) :Promise<void> => {
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
  return await registry.deprecateApp(`${vendor}.${name}`, version)
}

const prepareDeprecate = async (appsList: string[]): Promise<void> => {
  if (appsList.length === 0) {
    await switchToPreviousAccount(originalAccount, originalWorkspace)
    return
  }

  const app = await validateApp(head(appsList))
  try {
    log.debug('Starting to deprecate app:', app)
    await deprecateApp(app)
    log.info('Successfully deprecated', app)
  } catch (e) {
    if (e.response && e.response.status && e.response.status === 404) {
      log.error(`Error deprecating ${app}. App not found`)
    } else if (e.message && e.response.statusText) {
      log.error(`Error deprecating ${app}. ${e.message}. ${e.response.statusText}`)
      return await switchToPreviousAccount(originalAccount, originalWorkspace)
    } else {
      await switchToPreviousAccount(originalAccount, originalWorkspace)
      throw e
    }
  }
  await prepareDeprecate(tail(appsList))
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  originalAccount = getAccount()
  originalWorkspace = getWorkspace()
  const appsList = prepend(optionalApp || toAppLocator(await getManifest()), parseArgs(options._))

  if (!preConfirm && !await promptDeprecate(appsList)) {
    throw new UserCancelledError()
  }
  log.debug('Deprecating app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return prepareDeprecate(appsList)
}
