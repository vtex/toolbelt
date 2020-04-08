import { flags as oclifFlags } from '@oclif/command'
import chalk from 'chalk'

import { CustomCommand } from '../../lib/CustomCommand'
import { promptConfirm } from '../../lib/prompts'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { switchAccountMessage } from '../../lib/apps/utils'
import { switchAccount } from '../../lib/auth/switch'
import { parseLocator } from '../../locator'
import { UserCancelledError } from '../../errors'
import { createClients } from '../../clients'
import { ManifestValidator, ManifestEditor } from '../../lib/manifest'
import log from '../../logger'

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

export default class Deprecate extends CustomCommand {
  static description = 'Deprecate an app'

  static aliases = ['deprecate']

  static examples = ['vtex apps:deprecate vtex.service-example@0.0.1', 'vtex deprecate vtex.service-example@0.0.1']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    yes: oclifFlags.boolean({ description: 'Confirm all prompts', char: 'y', default: false }),
  }

  static args = [{ name: 'appId', required: true }]

  async run() {
    const { args, flags } = this.parse(Deprecate)
    const preConfirm = flags.yes
    const optionalApp = args.appId

    originalAccount = getAccount()
    originalWorkspace = getWorkspace()
    const appsList = [optionalApp || (await ManifestEditor.getManifestEditor()).appLocator]

    if (!preConfirm && !(await promptDeprecate(appsList))) {
      throw new UserCancelledError()
    }

    log.debug(`Deprecating app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
    return prepareAndDeprecateApps(appsList)
  }
}
