import log from '../../logger'
import {billing} from '../../clients'
import {validateAppAction} from './utils'
import {getManifest, validateApp} from '../../manifest'
import {toAppLocator} from './../../locator'

const {installApp} = billing

export const prepareInstall = async (app: string, reg: string): Promise<void> => {
  const validApp = validateApp(app)
  const billingPolicyAccepted = false
  const termsOfUseAccepted = false
  try {
    log.debug('Starting to install app', validApp)
    const billingResponse = await installApp(app, reg, billingPolicyAccepted, termsOfUseAccepted)
    if (!billingResponse) {
      throw new Error ('Something went wrong :(')
    }
    console.log(billingResponse)
    log.info(`Installed app ${app} successfully`)
  } catch (e) {
    console.log(e)
    console.log(e.response.data.errors)
    log.warn(`The following app was not installed: ${app}`)
    // log.error(`Error ${e.response.status}: ${e.response.statusText}. ${e.response.data.message}`)
  }
}

export default async (optionalApp: string, options) => {
  console.log('STARTING INSTALL')
  await validateAppAction(optionalApp)
  const app = optionalApp || toAppLocator(await getManifest())
  log.info('Installing through vtex.billing')
  log.debug('Installing app' + `${app}`)
  return prepareInstall(app, options.r || options.registry || 'smartcheckout')
}
