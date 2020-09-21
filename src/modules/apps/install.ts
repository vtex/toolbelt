import chalk from 'chalk'
import { compose, equals, head, path } from 'ramda'
import { Billing } from '../../api/clients/IOClients/apps/Billing'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'
import { isFreeApp, optionsFormatter, validateAppAction } from '../../api/modules/utils'
import { createRegistryClient } from './../../api/clients/IOClients/infra/Registry'

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
  return (await hasLicenseFile(name, version)) ? `https://extensions.myvtex.com/_v/terms/${name}@${version}` : termsURL
}

const checkBillingOptions = async (app: string, billingOptions: BillingOptions, force: boolean) => {
  const { termsURL, type, free } = billingOptions
  const license = await licenseURL(app, termsURL)
  log.warn(
    `${chalk.blue(app)} is a ${
      isFreeApp(type, free) ? chalk.green('free') : chalk.red('paid')
    } app. To install it, you need to accept the following Terms:\n\n${optionsFormatter(billingOptions, license)}\n`
  )
  const confirm = await promptPolicies()
  if (!confirm) {
    return
  }

  log.info('Starting to install app with accepted Terms')
  await installApp(app, true, force)
  log.debug('Installed after accepted terms')
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
