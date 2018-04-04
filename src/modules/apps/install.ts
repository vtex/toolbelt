import {prop} from 'ramda'
import * as inquirer from 'inquirer'

import log from '../../logger'
import {billing} from '../../clients'
import {validateAppAction} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

const {installApp} = billing

const promptPolicies = async () => {
  return prop('confirm', await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: 'Do you accept all the Terms?',
  }))
}

export const prepareInstall = async (app: string, reg: string): Promise<void> => {
  const validApp = validateApp(app)
  try {
    log.debug('Starting to install app', validApp)
    const billingResponse = await installApp(app, reg, false, false)
    if (!billingResponse) {
      throw new Error ('Something went wrong :(')
    }
    if (billingResponse.installed) {
      log.info(`Installed app ${app} successfully`)
      return
    } else {
      if (billingResponse.billingPolicyJSON) {
        const policies = billingResponse.billingPolicyJSON
        log.warn(`This is a paid app. In order for you to install it, you need to accept the following Terms:\n${policies}`)
        const confirm = await promptPolicies()
        if (!confirm) {
          log.info('User cancelled')
          process.exit()
        }
        log.debug('Starting to install app with accepted Terms', validApp)
        const responseAfterAccept = await installApp(app, reg, confirm, confirm)
        if (!responseAfterAccept) {
          throw new Error ('Something went wrong :(')
        }
        if (responseAfterAccept.installed) {
          log.info(`Installed app ${app} successfully`)
          return
        }
        throw new Error('Something went wrong during installation')
      }
    }
    console.log('billingResponse: ', billingResponse)
  } catch (e) {
    console.log(e)
    log.warn(`The following app was not installed: ${app}`)
  }
}

export default async (optionalApp: string, options) => {
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  log.info('Installing through vtex.billing')
  log.debug('Installing app' + `${app}`)
  return prepareInstall(app, options.r || options.registry || 'smartcheckout')
}
