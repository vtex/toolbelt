import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import * as opn from 'opn'
import * as jwt from 'jsonwebtoken'
import * as randomstring from 'randomstring'
import log from '../../logger'
import {onAuth} from '../../sse'
import {
  getLogin,
  saveToken,
  saveLogin,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
  Environment,
  saveEnvironment,
} from '../../conf'
import {publicEndpoint} from '../../env'

const [cachedAccount, cachedLogin, cachedWorkspace] = [getAccount(), getLogin(), getWorkspace()]
const details = cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const startUserAuth = (account: string, workspace: string): Bluebird<string | never> => {
  const state = randomstring.generate()
  const returnUrlEncoded = encodeURIComponent(`/_v/auth-server/v1/callback?state=${state}`)
  const url = `https://${workspace}--${account}.${publicEndpoint()}/_v/auth-server/v1/login/?ReturnUrl=${returnUrlEncoded}`
  opn(url, {wait: false})
  return onAuth(account, workspace, state)
}

const promptUsePrevious = (): Bluebird<boolean> =>
  inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Do you want to use the previous login details? (${details})`,
  })
  .then<boolean>(prop('confirm'))

const promptAccount = async (promptPreviousAcc) => {
  if (promptPreviousAcc) {
    const {confirm} = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      default: true,
      message: `Use previous account? (${chalk.blue(cachedAccount)})`,
    })
    if (confirm) {
      return cachedAccount
    }
  }
  const {account} = await inquirer.prompt({
    name: 'account',
    message: 'Account:',
    filter: (s) => s.trim(),
    validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
  })
  return account
}

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  saveLogin(login)
  saveAccount(account)
  saveToken(token)
  saveWorkspace(workspace)
}

const authAndSave = async (account, workspace, optionWorkspace): Promise<{login: string, token: string}> => {
  const token = await startUserAuth(account, optionWorkspace ? workspace : 'master')
  const decodedToken = jwt.decode(token)
  const login: string = decodedToken.sub
  saveCredentials(login, account, token, workspace)
  if (login.endsWith('@vtex.com.br')) {
    log.info(`Using staging (beta) IO environment due to VTEX domain. Switch back with ${chalk.gray('vtex config set env prod')}`)
    saveEnvironment(Environment.Staging)
  } else {
    saveEnvironment(Environment.Production)
  }
  return {login, token}
}

export default async (options) => {
  const optionAccount = options ? (options.a || options.account) : null
  const optionWorkspace = options ? (options.w || options.workspace) : null
  const usePrevious = !(optionAccount || optionWorkspace) && details && await promptUsePrevious()
  const account = optionAccount || (usePrevious && cachedAccount) || await promptAccount(cachedAccount && optionWorkspace)
  const workspace = optionWorkspace || (usePrevious && cachedWorkspace) || 'master'
  try {
    const {login, token} = await authAndSave(account, workspace, optionWorkspace)
    log.debug('Login successful', login, account, token, workspace)
    log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
  } catch (err) {
    if (err.statusCode === 404) {
      log.error('Workspace not found')
    } else {
      throw err
    }
  }
}
