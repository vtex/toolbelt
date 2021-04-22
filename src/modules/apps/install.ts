import chalk from 'chalk'
import enquirer from 'enquirer'
import { compose, equals, head, path } from 'ramda'
import { Billing } from '../../api/clients/IOClients/apps/Billing'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'
import { isFreeApp, isSponsoredApp, optionsFormatter, validateAppAction } from '../../api/modules/utils'
import { BillingMessages } from '../../lib/constants/BillingMessages'
import { switchOpen } from '../featureFlag/featureFlagDecider'

const PROMPT_PLAN_CHOICES_NAME = 'billingOptionsPlanChoices'
const BRAZILIAN_REAL_CURRENCY_CODE = 'BRL'
const ERROR_MESSAGE_APP_CONTRACT_NOT_FOUND = 'No contract found for app'

const installApp = (appName: string, termsOfUseAccepted: boolean, force: boolean, selectedPlanId?: string) =>
  Billing.createClient().installApp(appName, termsOfUseAccepted, force, selectedPlanId)
const legacyInstallApp = (descriptor: string) => createAppsClient().installApp(descriptor)

const isError = (errorCode: number) => compose(equals(errorCode), path(['response', 'status']))
const isForbiddenError = isError(403)
const isNotFoundError = isError(404)
const hasErrorMessage = path(['response', 'data', 'message'])

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

const buildBillingOptionsPlanChoices = ({ plans }: BillingOptions) =>
  plans?.reduce<Record<string, Plan>>((choices, plan) => {
    choices[plan.currency] = plan
    return choices
  }, {}) ?? {}

const appStoreProductPage = (app: string) => {
  const [appName] = app.split('@')
  const [vendor, name] = appName.split('.')
  return `https://apps.vtex.com/apps?salesChannel=2&textLink=${vendor}-${name}`
}

const promptCurrencyChoices = async (billingOptions: BillingOptions) => {
  const planChoices = buildBillingOptionsPlanChoices(billingOptions)
  const currencyChoices = Object.keys(planChoices)
  let [selectedCurrency] = currencyChoices
  if (currencyChoices.length > 1) {
    const answer = await enquirer.prompt({
      name: PROMPT_PLAN_CHOICES_NAME,
      message: BillingMessages.CURRENCY_OPTIONS,
      type: 'select',
      choices: currencyChoices,
    })
    selectedCurrency = answer[PROMPT_PLAN_CHOICES_NAME]
  }
  return planChoices[selectedCurrency]
}

const handleInternationalAppInstall = async (app: string, { id, currency }: Plan, force: boolean) => {
  try {
    await installApp(app, true, force, id)
  } catch (e) {
    if (!e.message?.startsWith(ERROR_MESSAGE_APP_CONTRACT_NOT_FOUND)) {
      throw e
    }
    const appWebsite = appStoreProductPage(app)
    log.info(BillingMessages.appCurrencyPage(currency, appWebsite))

    const shouldOpenProductPage = await promptConfirm(BillingMessages.shouldOpenPage(), true)
    if (shouldOpenProductPage) {
      switchOpen(appWebsite, { wait: false })
    }
  }
}

const checkBillingOptions = async (app: string, billingOptions: BillingOptions, force: boolean) => {
  const { termsURL } = billingOptions
  const license = await licenseURL(app, termsURL)
  let planId: string | undefined
  if (isFreeApp(billingOptions) || isSponsoredApp(billingOptions)) {
    log.info(BillingMessages.acceptToInstallFree(app))
  } else {
    log.info(BillingMessages.acceptToInstallPaid(app))
    const selectedPlan = await promptCurrencyChoices(billingOptions)
    planId = selectedPlan.id
    if (selectedPlan.currency !== BRAZILIAN_REAL_CURRENCY_CODE) {
      return handleInternationalAppInstall(app, selectedPlan, force)
    }
  }

  log.info(BillingMessages.billingTable(optionsFormatter(billingOptions, app, license)))
  const confirm = await promptPolicies()
  if (!confirm) {
    return
  }

  log.info(BillingMessages.INSTALL_STARTED)
  await installApp(app, true, force, planId)
  log.debug(BillingMessages.INSTALL_SUCCESS)
}

const prepareInstall = async (appsList: string[], force: boolean): Promise<void> => {
  for (const app of appsList) {
    ManifestValidator.validateApp(app)
    try {
      log.debug('Starting to install app', app)
      if (app === 'vtex.billing' || head(app.split('@')) === 'vtex.billing') {
        // eslint-disable-next-line no-await-in-loop
        await legacyInstallApp(app)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const { code, billingOptions } = await installApp(app, false, force)
        switch (code) {
          case 'installed_from_own_registry':
            log.debug('Installed from own registry')
            break
          case 'public_app':
            log.debug('Installed from public registry')
            break
          case 'installed_by_previous_purchase':
            log.debug('Installed from previous purchase')
            break
          case 'installed_free':
            log.debug('Free app')
            break
          case 'check_terms':
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
          case 'no_buy_app_license':
            log.error(
              `You do not have permission to purchase apps. Please check your VTEX IO 'Buy Apps' resource access in Account Managament`
            )
            break
          case 'area_unavailable':
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
