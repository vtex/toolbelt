import chalk from 'chalk'
import { compose, equals, head, path, prepend, tail } from 'ramda'

import { apps, billing } from '../../clients'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { getManifest, validateApp } from '../../manifest'
import { promptConfirm } from '../utils'
import { toAppLocator } from './../../locator'
import { optionsFormatter, parseArgs, validateAppAction } from './utils'

const { installApp } = billing
const { installApp: legacyInstallApp } = apps

const promptPolicies = async () => {
  return promptConfirm(
    'Do you accept all the Terms?'
  )
}

const checkBillingOptions = async (app: string, billingOptions: BillingOptions) => {
  log.warn(`${chalk.blue(app)} is a ${billingOptions.free ? chalk.green('free') : chalk.red('paid')} app. To install it, you need to accept the following Terms:\n\n${optionsFormatter(billingOptions)}\n`)
  const confirm = await promptPolicies()
  if (!confirm) {
    throw new UserCancelledError()
  }

  log.info('Starting to install app with accepted Terms')
  await installApp(app, true)
  log.debug('Installed after accepted terms')
}

export const prepareInstall = async (appsList: string[]): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = validateApp(head(appsList))

  try {
    log.debug('Starting to install app', app)
    if (app === 'vtex.billing' || head(app.split('@')) === 'vtex.billing') {
      await legacyInstallApp(app)
    } else {
      const {code, billingOptions} = await installApp(app, false)
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
          await checkBillingOptions(app, JSON.parse(billingOptions))
      }
    }
    log.info(`Installed app ${chalk.green(app)} successfully`)

  } catch (e) {
    if (e.name === UserCancelledError.name) {
      throw new UserCancelledError()
    }
    if (isNotFoundError(e)) {
      log.warn(`Billing app not found in current workspace. Please install it with ${chalk.green('vtex install vtex.billing')}`)
    } else if (isForbiddenError(e)) {
      log.error(`You do not have permission to install apps. Please check your VTEX IO 'Install App' resource access in Account Management`)
    } else if (hasErrorMessage(e)) {
      log.error(e.response.data.message)
    } else {
      switch (e.message) {
        case 'no_buy_app_license':
          log.error(`You do not have permission to purchase apps. Please check your VTEX IO 'Buy Apps' resource access in Account Managament`)
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

  await prepareInstall(tail(appsList))
}

const isError = (errorCode: number) => compose(equals(errorCode), path(['response', 'status']))
const isForbiddenError = isError(403)
const isNotFoundError = isError(404)
const hasErrorMessage = path(['response', 'data', 'message'])

const logGraphQLErrorMessage = (e) => {
  log.error('Installation failed!')
  log.error(e.message)
}

export default async (optionalApp: string, options) => {
  await validateAppAction('install', optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const appsList = prepend(app, parseArgs(options._))
  log.debug('Installing app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return prepareInstall(appsList)
}
