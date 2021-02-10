import chalk from 'chalk'
import enquirer from 'enquirer'
import { compose, equals, head, path } from 'ramda'
import { Billing } from '../../api/clients/IOClients/apps/Billing'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'
import { isFreeApp, optionsFormatter, validateAppAction } from '../../api/modules/utils'
import { BillingMessages } from '../../lib/constants/BillingMessages'

const PROMPT_PLAN_CHOICES_NAME = 'billingOptionsPlanChoices'

const { installApp } = Billing.createClient()
const { installApp: legacyInstallApp } = createAppsClient()

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

const buildBillingOptionsPlanChoices = ({ plans }: BillingOptions) => plans?.map(({ currency }) => currency) ?? []

const checkBillingOptions = async (app: string, billingOptions: BillingOptions, force: boolean) => {
  const { termsURL } = billingOptions
  const license = await licenseURL(app, termsURL)
  if (isFreeApp(billingOptions)) {
    log.info(BillingMessages.acceptToInstallFree(app))
  } else {
    log.info(BillingMessages.acceptToInstallPaid(app))
    console.log({ billingOptions: JSON.stringify(billingOptions, null, 2) })
    const planChoices = buildBillingOptionsPlanChoices(billingOptions)
    let [selectedChoice] = planChoices
    if (planChoices.length > 1) {
      const answer = await enquirer.prompt({
        name: PROMPT_PLAN_CHOICES_NAME,
        message:
          'This app can be purchased in different currencies. What currency do you want to use to complete the purchase?',
        type: 'select',
        choices: planChoices,
      })
      selectedChoice = answer[PROMPT_PLAN_CHOICES_NAME]
    }
    console.log(`selectedChoice = ${selectedChoice}`)
    if (selectedChoice !== 'BRL') {
      log.info('Please continue the installation in the App Store page')
      return
    }
  }

  log.info(BillingMessages.billingTable(optionsFormatter(billingOptions, app, license)))
  const confirm = await promptPolicies()
  if (!confirm) {
    return
  }

  log.info(BillingMessages.INSTALL_STARTED)
  await installApp(app, true, force)
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
