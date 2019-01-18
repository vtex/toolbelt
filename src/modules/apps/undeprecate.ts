import axios from 'axios'
import { AxiosResponse } from 'axios'
import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { head, prepend, prop, tail } from 'ramda'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { getManifest, validateApp } from '../../manifest'
import switchAccount from '../auth/switch'
import { parseLocator, toAppLocator } from './../../locator'
import { parseArgs, switchAccountMessage } from './utils'

const undeprecateRequestTimeOut = 10000  // 10 seconds
let originalAccount
let originalWorkspace

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to undeprecate this app in an account that differs from the indicated vendor. Do you want to undeprecate in account ${chalk.blue(vendor)}?`
}

const promptUndeprecate = (appsList: string[]): Bluebird<boolean> =>
  inquirer.prompt({
    message: `Are you sure you want to undeprecate app` + (appsList.length > 1 ? 's' : '') + ` ${chalk.green(appsList.join(', '))}?`,
    name: 'confirm',
    type: 'confirm',
  })
    .then<boolean>(prop('confirm'))

const promptUndeprecateOnVendor = (msg: string): Bluebird<boolean> =>
  inquirer.prompt({
    message: msg,
    name: 'confirm',
    type: 'confirm',
  })
    .then<boolean>(prop('confirm'))

const switchToPreviousAccount = async (previousAccount: string, previousWorkspace: string) => {
  const currentAccount = getAccount()
  if (previousAccount !== currentAccount) {
    const canSwitchToPrevious = await promptUndeprecateOnVendor(switchAccountMessage(previousAccount, currentAccount))
    if (canSwitchToPrevious) {
      return await switchAccount(previousAccount, {workspace: previousWorkspace})
    }
  }
  return
}

const undeprecateApp = async (app: string): Promise<AxiosResponse> => {
  const { vendor, name, version } = parseLocator(app)
  const account = getAccount()
  if (vendor !== account) {
    const canSwitchToVendor = await promptUndeprecateOnVendor(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      throw new UserCancelledError()
    }
    await switchAccount(vendor, {})
  }
  // The below 'axios' request is temporary until we implement an
  // `undeprecateApp` method in node-vtex-api and upgrade the library version
  // used in this project.
  const http = axios.create({
    baseURL: `http://apps.aws-us-east-1.vtex.io/`,
    timeout: undeprecateRequestTimeOut,
    headers: {
      'Authorization': getToken(),
      'Content-Type': 'application/json',
    },
  })
  const finalroute = `http://apps.aws-us-east-1.vtex.io/${vendor}/master/registry/${vendor}.${name}/${version}`
  console.log(finalroute)
  return await http.patch(finalroute, {deprecated: false})
}

const prepareUndeprecate = async (appsList: string[]): Promise<void> => {
  if (appsList.length === 0) {
    await switchToPreviousAccount(originalAccount, originalWorkspace)
    return
  }

  const app = await validateApp(head(appsList))
  try {
    log.debug('Starting to undeprecate app:', app)
    await undeprecateApp(app)
    log.info('Successfully undeprecated', app)
  } catch (e) {
    if (e.response && e.response.status && e.response.status === 404) {
      log.error(`Error undeprecating ${app}. App not found`)
    } else if (e.message && e.response.statusText) {
      log.error(`Error undeprecating ${app}. ${e.message}. ${e.response.statusText}`)
      await switchToPreviousAccount(originalAccount, originalWorkspace)
      return
    } else {
      await switchToPreviousAccount(originalAccount, originalWorkspace)
      throw e
    }
  }
  await prepareUndeprecate(tail(appsList))
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  originalAccount = getAccount()
  originalWorkspace = getWorkspace()
  const appsList = prepend(optionalApp || toAppLocator(await getManifest()), parseArgs(options._))

  if (!preConfirm && !await promptUndeprecate(appsList)) {
    throw new UserCancelledError()
  }
  log.debug(`Undeprecating app ${appsList.length > 1 ? 's' : ''} : ${appsList.join(', ')}`)
  return prepareUndeprecate(appsList)
}
