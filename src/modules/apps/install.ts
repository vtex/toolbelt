import chalk from 'chalk'
import * as inquirer from 'inquirer'
import {head, prepend, prop, tail} from 'ramda'

import {apps, billing} from '../../clients'
import log from '../../logger'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'
import {optionsFormatter, parseArgs, validateAppAction} from './utils'

const {installApp} = billing
const {installApp: legacyInstallApp} = apps

const promptPolicies = async () => {
  return prop('confirm', await inquirer.prompt({
    message: 'Do you accept all the Terms?',
    name: 'confirm',
    type: 'confirm',
  }))
}

const checkBillingOptions = async (app: string, reg: string, billingOptions: BillingOptions) => {
  log.warn(`${chalk.green(app)} is a paid app. In order for you to install it, you need to accept the following Terms:\n\n${optionsFormatter(billingOptions)}\n`)
  const confirm = await promptPolicies()
  if (!confirm) {
    throw new Error('User cancelled')
  }

  log.info('Starting to install app with accepted Terms')
  await installApp(app, reg, true)
  log.debug('Installed after accepted terms')
}

export const prepareInstall = async (appsList: string[], reg: string): Promise<void> => {
  if (appsList.length === 0) {
    return
  }
  const app = validateApp(head(appsList))

  try {
    log.debug('Starting to install app', app)
    if (app === 'vtex.billing' || head(app.split('@')) === 'vtex.billing') {
      await legacyInstallApp('vtex.billing', reg)
    } else {
      const {code, billingOptions} = await installApp(app, reg, false)
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
          await checkBillingOptions(app, reg, JSON.parse(billingOptions))
      }
    }
    log.info(`Installed app ${chalk.green(app)} successfully`)

  } catch (e) {
    if (e.response && e.response.data && e.response.data.error) {
      if (e.response.data.code === 'routing_error' && e.response.data.error.includes('not found')) {
        log.warn(`Billing app not found in current workspace. Please install it with ${chalk.green('vtex install vtex.billing')}`)
      } else {
        log.error(e.response.data.error)
      }
    } else {
      logGraphQLErrorMessage(e)
    }
    log.warn(`The following app was not installed: ${app}`)
  }

  await prepareInstall(tail(appsList), reg)
}

const logGraphQLErrorMessage = (e) => {
  const errorMessage = e instanceof Array
  ? e.forEach(err => log.error(err.message ? err.message : err))
  : e
  log.error(errorMessage)
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  const appsList = prepend(app, parseArgs(options._))
  log.debug('Installing app' + (appsList.length > 1 ? 's' : '') + `: ${appsList.join(', ')}`)
  return prepareInstall(appsList, options.r || options.registry || 'smartcheckout')
}
