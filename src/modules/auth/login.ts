import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as jwt from 'jsonwebtoken'
import * as opn from 'opn'
import { prop } from 'ramda'
import * as randomstring from 'randomstring'
import * as conf from '../../conf'
import { publicEndpoint } from '../../env'
import log from '../../logger'
import { onAuth } from '../../sse'

const [cachedAccount, cachedLogin, cachedWorkspace] = [conf.getAccount(), conf.getLogin(), conf.getWorkspace()]
const details = cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const startUserAuth = (account: string, workspace: string): Bluebird<string | never> => {
  const state = randomstring.generate()
  const returnUrlEncoded = encodeURIComponent(`/_v/auth-server/v1/callback?state=${state}`)
  const url = `https://${workspace}--${account}.${publicEndpoint()}/_v/auth-server/v1/login/?ReturnUrl=${returnUrlEncoded}`
  opn(url, { wait: false })
  return onAuth(account, workspace, state)
}

const promptUsePrevious = (): Bluebird<boolean> =>
  inquirer.prompt({
    message: `Do you want to use the previous login details? (${details})`,
    name: 'confirm',
    type: 'confirm',
  })
    .then<boolean>(prop('confirm'))

const promptAccount = async (promptPreviousAcc) => {
  if (promptPreviousAcc) {
    const { confirm } = await inquirer.prompt({
      default: true,
      message: `Use previous account? (${chalk.blue(cachedAccount)})`,
      name: 'confirm',
      type: 'confirm',
    })
    if (confirm) {
      return cachedAccount
    }
  }
  const { account } = await inquirer.prompt({
    filter: (s) => s.trim(),
    message: 'Account:',
    name: 'account',
    validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
  })
  return account
}

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  conf.saveLogin(login)
  conf.saveAccount(account)
  conf.saveToken(token)
  conf.saveWorkspace(workspace)
}

const authAndSave = async (account, workspace, optionWorkspace): Promise<{ login: string, token: string }> => {
  const token = await startUserAuth(account, optionWorkspace ? workspace : 'master')
  const decodedToken = jwt.decode(token)
  const login: string = decodedToken.sub
  saveCredentials(login, account, token, workspace)
  return { login, token }
}

export default async (options) => {
  const optionAccount = options ? (options.a || options.account) : null
  const optionWorkspace = options ? (options.w || options.workspace) : null
  const usePrevious = !(optionAccount || optionWorkspace) && details && await promptUsePrevious()
  const account = optionAccount || (usePrevious && cachedAccount) || await promptAccount(cachedAccount && optionWorkspace)
  const workspace = optionWorkspace || (usePrevious && cachedWorkspace) || 'master'
  try {
    const { login, token } = await authAndSave(account, workspace, optionWorkspace)
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
