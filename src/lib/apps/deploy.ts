import chalk from 'chalk'

import { createClients } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../utils/conf'
import { UserCancelledError } from '../../utils/errors'
import { parseLocator, toAppLocator } from '../../utils/locator'
import log from '../../utils/logger'
import { getManifest } from '../../utils/manifest'
import { switchAccount } from '../auth/switch'
import { promptConfirm } from '../../utils/prompts'
import { switchAccountMessage } from '../../utils/utils'
import { ManifestValidator } from '../../utils/manifest/ManifestValidator'

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deploy this app in an account that differs from the indicated vendor. Do you want to deploy in account ${chalk.blue(
    vendor
  )}?`
}

const promptDeploy = (app: string) => promptConfirm(`Are you sure you want to deploy app ${app}`)

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptConfirm(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      return switchAccount(previousAccount, { workspace: previousWorkspace })
    }
  }
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
  return registry.validateApp(`${vendor}.${name}`, version)
}

const prepareDeploy = async (app, originalAccount, originalWorkspace: string): Promise<void> => {
  app = await ManifestValidator.validateApp(app)
  try {
    log.debug('Starting to deploy app:', app)
    await deployRelease(app)
    log.info('Successfully deployed', app)
  } catch (e) {
    const data = e.response?.data
    const code = data?.code
    if (code === 'app_is_not_rc') {
      log.error(`App ${app} was already deployed.`)
    } else if (data?.message) {
      log.error(data.message)
    } else {
      await switchToPreviousAccount(originalAccount, originalWorkspace)
      throw e
    }
  }

  await switchToPreviousAccount(originalAccount, originalWorkspace)
}

export async function appsDeploy(optionalApp: string, preConfirm: boolean) {
  const originalAccount = getAccount()
  const originalWorkspace = getWorkspace()
  const app = optionalApp || toAppLocator(await getManifest())

  if (!preConfirm && !(await promptDeploy(app))) {
    throw new UserCancelledError()
  }
  log.debug(`Deploying app ${app}`)
  return prepareDeploy(app, originalAccount, originalWorkspace)
}
