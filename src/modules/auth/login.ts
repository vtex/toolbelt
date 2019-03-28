import axios from 'axios'
import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as childProcess from 'child_process'
import * as enquirer from 'enquirer'
import * as jwt from 'jsonwebtoken'
import * as opn from 'opn'
import { join } from 'path'
import { prop } from 'ramda'
import * as randomstring from 'randomstring'

import * as conf from '../../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../../env'
import log from '../../logger'
import { onAuth } from '../../sse'
import { promptConfirm } from '../prompts'

const [cachedAccount, cachedLogin, cachedWorkspace] = [conf.getAccount(), conf.getLogin(), conf.getWorkspace()]
const details = cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const startUserAuth = (account: string, workspace: string): Bluebird<string[] | never> => {
  const state = randomstring.generate()
  const baseUrl = `https://${account}${clusterIdDomainInfix()}.${publicEndpoint()}`
  const returnUrl = `/_v/private/auth-server/v1/callback?workspace=${workspace}&state=${state}`
  const returnUrlEncoded = encodeURIComponent(returnUrl)
  const fullReturnUrl = baseUrl + returnUrl
  const url = `${baseUrl}/_v/private/auth-server/v1/login/?workspace=${workspace}&ReturnUrl=${returnUrlEncoded}`

  opn(url, { wait: false })
  return onAuth(account, workspace, state, fullReturnUrl)
}

const promptUsePrevious = (): Bluebird<boolean> =>
  promptConfirm(`Do you want to use the previous login details? (${details})`)

const promptAccount = async (promptPreviousAcc) => {
  if (promptPreviousAcc) {
    const confirm =  await promptConfirm(
      `Use previous account? (${chalk.blue(cachedAccount)})`
    )
    if (confirm) {
      return cachedAccount
    }
  }

  const account = prop('account', await enquirer.prompt({
    type: 'input',
    result: (s) => s.trim(),
    message: 'Account:',
    name: 'account',
    validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
  }))
  return account
}

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  conf.saveLogin(login)
  conf.saveAccount(account)
  conf.saveToken(token)
  conf.saveWorkspace(workspace)
}

const authAndSave = async (account, workspace, optionWorkspace): Promise<{ login: string, token: string, returnUrl: string }> => {
  const [token, returnUrl] = await startUserAuth(account, optionWorkspace ? workspace : 'master')
  const decodedToken = jwt.decode(token)
  const login: string = decodedToken.sub
  saveCredentials(login, account, token, workspace)
  if (login.endsWith('@vtex.com.br') && await isStagingRegionEnabled()) {
    log.info(`Using staging (beta) IO environment due to VTEX domain. Switch back with ${chalk.gray('vtex config set env prod')}`)
    conf.saveEnvironment(conf.Environment.Staging)
  } else {
    conf.saveEnvironment(conf.Environment.Production)
  }

  return { login, token, returnUrl }
}


const isStagingRegionEnabled = async (): Promise<boolean> => {
  try {
    const resp = await axios.get(`http://router.${conf.Region.Staging}.vtex.io/_production`)
    return resp.data
  } catch {
    return false
  }
}

const closeChromeTabIfMac = (returnUrl: string) => {
  if (process.platform === 'darwin') {
    const cp = childProcess.spawn('osascript', [join(__dirname, '../../../scripts/closeChrome.scpt'), returnUrl], {stdio: 'ignore', detached: true})
    cp.unref()
  }

}

export default async (options) => {
  const defaultArgumentAccount = options && options._ && options._[0]
  const optionAccount = options ? (options.a || options.account || defaultArgumentAccount) : null
  const optionWorkspace = options ? (options.w || options.workspace) : null
  const usePrevious = !(optionAccount || optionWorkspace) && details && await promptUsePrevious()
  const account = optionAccount || (usePrevious && cachedAccount) || await promptAccount(cachedAccount && optionWorkspace)
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
