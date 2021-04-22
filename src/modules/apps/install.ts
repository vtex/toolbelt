import chalk from 'chalk'
import { Billing } from '../../api/clients/IOClients/apps/Billing'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'
import { isFreeApp, optionsFormatter, validateAppAction } from '../../api/modules/utils'
import { BillingMessages } from '../../lib/constants/BillingMessages'
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

const promptPolicies = async () => {
  return promptConfirm('Do you accept all the Terms?')
}

const hasLicenseFile = async (name: string, version: string) => {
  const client = createRegistryClient()
  try {
    await client.getAppFile(name, version, '/public/metadata/licenses/en-US.md')
    return true
  } catch (err) {
    if (err.response?.status === 404) {
      return false
    }
    throw err
  }
}

const licenseURL = async (app: string, termsURL?: string): Promise<string | undefined> => {
  const [name, argVersion] = app.split('@')
  const version = argVersion ?? 'x'
  return (await hasLicenseFile(name, version)) ? `https://apps.vtex.com/_v/terms/${name}@${version}` : termsURL
}

const checkBillingOptions = async (app: string, billingOptions: BillingOptions, force: boolean) => {
  const { termsURL } = billingOptions
  const license = await licenseURL(app, termsURL)
  log.info(
    isFreeApp(billingOptions) ? BillingMessages.acceptToInstallFree(app) : BillingMessages.acceptToInstallPaid(app)
  )
  log.info(BillingMessages.billingTable(optionsFormatter(billingOptions, app, license)))
  const confirm = await promptPolicies()
  if (!confirm) {
    return
  }

  log.info(BillingMessages.INSTALL_STARTED)
  await installApp(app, true, force)
  log.debug(BillingMessages.INSTALL_SUCCESS)
}

export const isBillingApp = (app: string) => {
  const billingRegex = /^vtex\.billing(@.*)?$/
  return billingRegex.test(app)
}

const prepareInstall = async (appsList: string[], force: boolean): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to install app', app)
      if (isBillingApp(app)) {
        // eslint-disable-next-line no-await-in-loop
        await legacyInstallApp(app)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const { code, billingOptions } = await installApp(app, false, force)
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
            break
          case InstallStatus.CHECK_TERMS:
            if (!billingOptions) {
              throw new Error('Failed to get billing options')
            }
            // eslint-disable-next-line no-await-in-loop
            await checkBillingOptions(app, JSON.parse(billingOptions), force)
        }
      }
      log.info(`Installed app ${chalk.green(app)} successfully`)
    } catch (e) {
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
          case InstallStatus.USER_HAS_NO_BUY_APP_LICENSE:
            log.error(
              `You do not have permission to purchase apps. Please check your VTEX IO 'Buy Apps' resource access in Account Managament`
            )
            break
          case InstallStatus.AREA_UNAVAILABLE:
            log.error('Unfortunately, app purchases are not yet available in your region')
            break
          default:
            logGraphQLErrorMessage(e)
        }
      }
      log.warn(`The following app was not installed: ${app}`)
    }
  }
}

export default async (optionalApps: string[], options) => {
  const force = options.f || options.force
  const confirm = await validateAppAction('install', optionalApps)
  if (!confirm) return
  const appsList = optionalApps.length > 0 ? optionalApps : [(await ManifestEditor.getManifestEditor()).appLocator]
  log.debug(`Installing app${appsList.length > 1 ? 's' : ''}: ${appsList.join(', ')}`)
  return prepareInstall(appsList, force)
}
