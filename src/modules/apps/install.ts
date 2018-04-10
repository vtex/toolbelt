import {prop} from 'ramda'
import * as inquirer from 'inquirer'

import log from '../../logger'
import {apps, billing} from '../../clients'
import {validateAppAction} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

const {installApp} = billing
const {installApp: legacyInstallApp} = apps

const promptPolicies = async () => {
  return prop('confirm', await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: 'Do you accept all the Terms?',
  }))
}

const legacyInstall = async (app: string, reg: string): Promise<void> => {
  try {
    log.debug('Starting legacy install')
    await legacyInstallApp(app, reg)
    log.info(`Installed app ${app} successfully`)
  } catch (e) {
    log.warn(`The following app was not installed: ${app}`)
    log.error(`Error ${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
  }
}

export const prepareInstall = async (app: string, reg: string): Promise<void> => {
  const validApp = validateApp(app)
  try {
    const billingResponse = await installApp(validApp, reg, false)
    if (billingResponse.installed) {
      log.info(`Installed app ${validApp} successfully`)
    } else {
      if (billingResponse.billingOptions) {
        const options = billingResponse.billingOptions
        log.warn(`This is a paid app. In order for you to install it, you need to accept the following Terms:\n${options}`)
        const confirm = await promptPolicies()
        if (!confirm) {
          log.info('User cancelled')
          process.exit()
        }
        log.info('Starting to install app with accepted Terms')
        const responseAfterAccept = await installApp(validApp, reg, true)
        if (responseAfterAccept.installed) {
          log.info(`Installed app ${validApp} successfully`)
        }
      } else {
        throw new Error('Failed to get billing options')
      }
    }
  } catch (e) {
    if (e.response && e.response.data && e.response.data.error) {
      if (e.response.data.error.includes('Unable to find vtex.billing in worskpace dependencies')) {
        log.debug('Billing app not found in current workspace')
        return await legacyInstall(validApp, reg)
      } else {
        log.error(e.response.data.error)
      }
    } else {
      log.error(e)
    }
    log.warn(`The following app was not installed: ${app}`)
  }
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  log.debug(`Installing app ${app}`)
  return prepareInstall(app, options.r || options.registry || 'smartcheckout')
}
