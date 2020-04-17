import chalk from 'chalk'
import { createClients } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { ManifestValidator } from '../../lib/manifest'
import { parseLocator, toAppLocator } from '../../locator'
import log from '../../logger'
import { getManifest } from '../../manifest'
import switchAccount from '../auth/switch'
import { promptConfirm } from '../prompts'
import { switchAccountMessage } from './utils'

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

const deployRelease = async (app: string): Promise<boolean> => {
  const { vendor, name, version } = parseLocator(app)
  const account = getAccount()
  if (vendor !== account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      return false
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: getToken() }
  const { registry } = createClients(context)
  registry.validateApp(`${vendor}.${name}`, version)
  return true
}

const prepareDeploy = async (app, originalAccount, originalWorkspace: string): Promise<void> => {
  app = await ManifestValidator.validateApp(app)
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

  if (!preConfirm && !(await promptDeploy(app))) {
    return
  }
  log.debug(`Deploying app ${app}`)
  return prepareDeploy(app, originalAccount, originalWorkspace)
}
