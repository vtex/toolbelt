import { getVendorFromApp, validateAppAction } from '../../api/modules/utils'
import chalk from 'chalk'
import { Billing } from '../../api/clients/IOClients/apps/Billing'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'

import { BillingMessages } from '../../lib/constants/BillingMessages'
import { switchOpen } from '../featureFlag/featureFlagDecider'
import { SessionManager } from '../../api/session/SessionManager'
import { InstallStatus } from '../../lib/constants/InstallStatus'

const installApp = (appName: string, termsOfUseAccepted: boolean, force: boolean) =>
  Billing.createClient().installApp(appName, termsOfUseAccepted, force)
const legacyInstallApp = (descriptor: string) => createAppsClient().installApp(descriptor)

const isError = (errorCode: number) => (e: any) => e?.response?.status === errorCode
export const isForbiddenError = isError(403)
export const isNotFoundError = isError(404)
export const hasErrorMessage = (e: any) => e?.response?.data?.message !== undefined

const logGraphQLErrorMessage = e => {
  log.error('Installation failed!')
  log.error(e.message)
}

const appStoreProductPage = (app: string) => {
  const [appName] = app.split('@')
  const [vendor, name] = appName.split('.')
  return `https://apps.vtex.com/${vendor}-${name}/p`
}

async function handleAppStoreContractNotFoundError(app: string) {
  const appWebsite = appStoreProductPage(app)
  log.info(BillingMessages.getAppForInstall(appWebsite))

  const shouldOpenProductPage = await promptConfirm(BillingMessages.shouldOpenPage(), true)
  if (shouldOpenProductPage) {
    switchOpen(appWebsite, { wait: false })
  }
}

export const isBillingApp = (app: string) => {
  const billingRegex = /^vtex\.billing(@.*)?$/
  return billingRegex.test(app)
}

function handleAccountNotSponsoredByVendorError(app: string) {
  const { account } = SessionManager.getSingleton()
  const vendor = getVendorFromApp(app)
  log.error(BillingMessages.accountNotSponsoredByVendorError(app, account, vendor))
}

const prepareInstall = async (appsList: string[], force: boolean): Promise<void> => {
  let exitWithError = false

  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to install app', app)
      if (isBillingApp(app)) {
        // eslint-disable-next-line no-await-in-loop
        await legacyInstallApp(app)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const { code } = await installApp(app, true, force)
        switch (code) {
          case InstallStatus.OWN_REGISTRY:
            log.debug('Installed from own registry')
            break
          case InstallStatus.PUBLIC_REGISTRY:
            log.debug('Installed from public registry')
            break
          case InstallStatus.PREVIOUS_PURCHASE:
            log.debug('Installed from previous purchase')
            break
          case InstallStatus.FREE:
            log.debug('Free app')
        }
      }
      log.info(`Installed app ${chalk.green(app)} successfully`)
    } catch (e) {
      exitWithError = true
      if (isNotFoundError(e)) {
        log.warn(
          `Billing app not found in current workspace. Please install it with ${chalk.green(
            'vtex install vtex.billing'
          )}`
        )
      } else if (isForbiddenError(e)) {
        log.error(
          `You do not have permission to install apps. Please check your VTEX IO 'Install App' resource access in Account Management`
        )
      } else if (hasErrorMessage(e)) {
        log.error(e.response.data.message)
      } else {
        switch (e.message) {
          case InstallStatus.CONTRACT_NOT_FOUND:
            // eslint-disable-next-line no-await-in-loop
            await handleAppStoreContractNotFoundError(app)
            break
          case InstallStatus.ACCOUNT_NOT_SPONSORED:
            handleAccountNotSponsoredByVendorError(app)
            break
          default:
            logGraphQLErrorMessage(e)
        }
      }
      log.warn(`The following app was not installed: ${app}`)
    }
  }

  if (exitWithError) process.exit(1)
}

export default async (optionalApps: string[], options) => {
  const force = options.f || options.force
  const confirm = await validateAppAction('install', optionalApps)
  if (!confirm) return
  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]
  log.debug(`Installing app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
  return prepareInstall(appsList, force)
}
