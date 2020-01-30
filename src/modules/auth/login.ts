import axios from 'axios'
import Bluebird from 'bluebird'
import chalk from 'chalk'
import childProcess from 'child_process'
import enquirer from 'enquirer'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import { join } from 'path'
import { prop } from 'ramda'
import randomstring from 'randomstring'

import * as conf from '../../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../../env'
import log from '../../logger'
import { onAuth } from '../../sse'
import { promptConfirm } from '../prompts'

const [cachedAccount, cachedLogin, cachedWorkspace] = [conf.getAccount(), conf.getLogin(), conf.getWorkspace()]
const details =
  cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const oldLoginUrls = (workspace: string, state: string): [string, string] => {
  const returnUrl = `/_v/private/auth-server/v1/callback?workspace=${workspace}&state=${state}`
  const url = `/_v/private/auth-server/v1/login/?workspace=${workspace}`
  return [url, returnUrl]
}

const newLoginUrls = (workspace: string, state: string): [string, string] => {
  const returnUrl = `/_v/private/auth-server/v1/callback?workspace=${workspace}&state=${state}`
  const url = `/_v/segment/admin-login/v1/login?workspace=${workspace}`
  return [url, returnUrl]
}

const getLoginUrl = async (account: string, workspace: string, state: string): Promise<[string, string]> => {
  const baseUrl = `https://${account}${clusterIdDomainInfix()}.${publicEndpoint()}`
  let [url, returnUrl] = newLoginUrls(workspace, state)
  try {
    const response = await axios.get(`${baseUrl}${url}`)
    if (!response.data.match(/vtex\.admin-login/)) {
      throw new Error('Unexpected response from admin-login')
    }
  } catch (e) {
    const oldUrls = oldLoginUrls(workspace, state)
    url = oldUrls[0]
    returnUrl = oldUrls[1]
  }
  const fullReturnUrl = baseUrl + returnUrl
  const returnUrlEncoded = encodeURIComponent(returnUrl)
  return [`${baseUrl}${url}&returnUrl=${returnUrlEncoded}`, fullReturnUrl]
}

const startUserAuth = async (account: string, workspace: string): Promise<string[] | never> => {
  const state = randomstring.generate()
  const [url, fullReturnUrl] = await getLoginUrl(account, workspace, state)
  opn(url, { wait: false })
  return onAuth(account, workspace, state, fullReturnUrl)
}

const promptUsePrevious = (): Bluebird<boolean> =>
  promptConfirm(`Do you want to use the previous login details? (${details})`)

const promptAccount = async promptPreviousAcc => {
  if (promptPreviousAcc) {
    const confirm = await promptConfirm(`Use previous account? (${chalk.blue(cachedAccount)})`)
    if (confirm) {
      return cachedAccount
    }
  }

  const account = prop(
    'account',
    await enquirer.prompt({
      type: 'input',
      result: s => s.trim(),
      message: 'Account:',
      name: 'account',
      validate: s => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
    })
  )
  return account
}

export const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  conf.saveLogin(login)
  conf.saveAccount(account)
  conf.saveToken(token)
  conf.saveAccountToken(account, token)
  conf.saveWorkspace(workspace)
}

const authAndSave = async (
  account,
  workspace,
  optionWorkspace
): Promise<{ login: string; token: string; returnUrl: string }> => {
  const [token, returnUrl] = await startUserAuth(account, optionWorkspace ? workspace : 'master')
  const decodedToken = jwt.decode(token)
  const login: string = decodedToken.sub
  saveCredentials(login, account, token, workspace)

  return { login, token, returnUrl }
}

const closeChromeTabIfMac = (returnUrl: string) => {
  if (process.platform === 'darwin') {
    const cp = childProcess.spawn('osascript', [join(__dirname, '../../../scripts/closeChrome.scpt'), returnUrl], {
      stdio: 'ignore',
      detached: true,
    })
    cp.unref()
  }
}

export default async options => {
  const defaultArgumentAccount = options && options._ && options._[0]
  const optionAccount = options ? options.a || options.account || defaultArgumentAccount : null
  const optionWorkspace = options ? options.w || options.workspace : null
  const usePrevious = !(optionAccount || optionWorkspace) && details && (await promptUsePrevious())
  const account =
    optionAccount || (usePrevious && cachedAccount) || (await promptAccount(cachedAccount && optionWorkspace))
  const workspace = optionWorkspace || (usePrevious && cachedWorkspace) || 'master'
  try {
    const { login, token, returnUrl } = await authAndSave(account, workspace, optionWorkspace)
    log.debug('Login successful', login, account, token, workspace)
    log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
    closeChromeTabIfMac(returnUrl)
  } catch (err) {
    if (err.statusCode === 404) {
      log.error('Account/Workspace not found')
    } else {
      throw err
    }
  }
}
