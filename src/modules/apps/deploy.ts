import chalk from 'chalk'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import { ManifestValidator } from '../../api/manifest'
import { getManifest } from '../../api/manifest/ManifestUtil'
import { SessionManager } from '../../api/session/SessionManager'
import { parseLocator, toAppLocator } from '../../api/locator'
import log from '../../api/logger'

import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import { promptConfirm } from '../../api/modules/prompts'

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deploy this app in an account that differs from the indicated vendor. Do you want to deploy in account ${chalk.blue(
    vendor
  )}?`
}

const promptDeploy = (app: string) => promptConfirm(`Are you sure you want to deploy app ${app}`)

const deployRelease = async (app: string): Promise<boolean> => {
  const { vendor, name, version } = parseLocator(app)
  const session = SessionManager.getSingleton()
  if (vendor !== session.account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      return false
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: session.token }
  const registry = createRegistryClient(context)
  await registry.validateApp(`${vendor}.${name}`, version)
  return true
}

const prepareDeploy = async (app, originalAccount, originalWorkspace: string): Promise<void> => {
  app = ManifestValidator.validateApp(app)
  try {
    log.debug('Starting to deploy app:', app)
    const deployed = await deployRelease(app)
    if (deployed) {
      log.info('Successfully deployed', app)
    }
  } catch (e) {
    const data = e.response?.data
    const code = data?.code
    if (code === 'app_is_not_rc') {
      log.error(`App ${app} was already deployed.`)
    } else if (data?.message) {
      log.error(data.message)
    } else {
      await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
      throw e
    }
  }

  await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes

  const { account: originalAccount, workspace: originalWorkspace } = SessionManager.getSingleton()
  const app = optionalApp || toAppLocator(await getManifest())

  if (!preConfirm && !(await promptDeploy(app))) {
    return
  }
  log.debug(`Deploying app ${app}`)
  return prepareDeploy(app, originalAccount, originalWorkspace)
}
