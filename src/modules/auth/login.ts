import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import * as opn from 'opn'
import * as jwt from 'jsonwebtoken'
import * as EventSource from 'eventsource'
import * as randomstring from 'randomstring'
import log from '../../logger'
import {
  getLogin,
  saveToken,
  saveLogin,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
} from '../../conf'

const [cachedAccount, cachedLogin, cachedWorkspace] = [getAccount(), getLogin(), getWorkspace()]
const details = cachedAccount && `${chalk.green(cachedLogin)} @ ${chalk.green(cachedAccount)} / ${chalk.green(cachedWorkspace)}`

const startUserAuth = (account: string, workspace: string): Bluebird<string | never> => {
  const state = randomstring.generate()
  const returnUrlEncoded = encodeURIComponent(`/_toolbelt/callback?state=${state}&workspace=${workspace}`)
  const url = `https://${account}.myvtex.com/admin/login/?workspace=${workspace}&ReturnUrl=${returnUrlEncoded}`
  opn(url, {wait: false})

  return new Promise((resolve, reject) => {
    const es = new EventSource(`https://${account}.myvtex.com/_toolbelt/sse/${state}?workspace=${workspace}`)
    es.addEventListener('message', (msg: MessageJSON) => {
      const {
        body: token,
      }: Message = JSON.parse(msg.data)
      es.close()
      resolve(token)
    })

    es.onerror = (err) => {
      log.error(`Connection to login server has failed with status ${err.status}`)
      reject(err)
    }
  })
}

const promptUsePrevious = (): Bluebird<boolean> =>
  inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Do you want to use the previous login details? (${details})`,
  })
  .then<boolean>(prop('confirm'))

const promptAccount = (): Bluebird<string> =>
  inquirer.prompt({
    name: 'account',
    message: 'Account:',
    filter: (s) => s.trim(),
    validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
  })
  .then<string>(prop('account'))

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  saveLogin(login)
  saveAccount(account)
  saveToken(token)
  saveWorkspace(workspace)
}

const authAndSave = async (account, workspace): Promise<{login: string, token: string}> => {
  const token = await startUserAuth(account, workspace)
  const decodedToken = jwt.decode(token)
  const login = decodedToken.sub
  saveCredentials(login, account, token, workspace)
  return {login, token}
}

export default {
  description: 'Log into a VTEX account',
  options: [
    {
      short: 'a',
      long: 'account',
      description: 'Specify login account',
      type: 'string',
    },
    {
      short: 'w',
      long: 'workspace',
      description: 'Specify login workspace',
      type: 'string',
    },
  ],
  handler: async (options) => {
    const optionAccount = options.a || options.account
    const optionWorkspace = options.w || options.workspace
    const usePrevious = !(optionAccount && optionWorkspace) && details && await promptUsePrevious()
    const account = optionAccount || (usePrevious && cachedAccount) || await promptAccount()
    const workspace = optionWorkspace || (usePrevious && cachedWorkspace) || 'master'
    const {login, token} = await authAndSave(account, workspace)
    log.debug('Login successful', login, account, token, workspace)
    log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
  },
}
