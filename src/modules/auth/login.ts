import {prop} from 'ramda'
import {ID} from '@vtex/api'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import * as validator from 'validator'

import log from '../../logger'
import endpoint from '../../endpoint'
import {version} from '../../../package.json'
import {
  getLogin,
  saveToken,
  saveLogin,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
} from '../../conf'

const {mapSeries, all} = Bluebird
const [cachedAccount, cachedLogin, cachedWorkspace] = [getAccount(), getLogin(), getWorkspace()]
const vtexid = new ID(endpoint('vtexid'), {
  authToken: 'abc123',
  userAgent: `Toolbelt/${version}`,
})

const workspacesClient = () => {
  const clients = '../../clients.js'
  try {
    delete require.cache[require.resolve(clients)]
  } catch (e) {}
  return require(clients)['workspaces']
}

const isVtexUser = (email: string): boolean =>
  email.indexOf('@vtex.com') >= 0

const handleAuthResult = (result): Bluebird<never> | string =>
  result.authStatus !== 'Success'
    ? Promise.reject(result.authStatus) : result.authCookie.Value

const vtexUserAuth = (email: string, prompt: () => Bluebird<string>): Bluebird<string | never> =>
  vtexid.getTemporaryToken()
    .then(token => {
      log.debug('Sending code to email', {token, email})
      return vtexid.sendCodeToEmail(token, email)
        .then(prompt)
        .tap(() => log.debug('Getting auth token with email code', {token, email}))
        .then(code => vtexid.getEmailCodeAuthenticationToken(token, email, code))
        .then(handleAuthResult)
    })

const userAuth = (email: string, prompt: () => Bluebird<string>): Bluebird<string | never> =>
  vtexid.getTemporaryToken()
    .then(token =>
      prompt()
        .tap(() => log.debug('Getting auth token with password', {token, email}))
        .then(password => vtexid.getPasswordAuthenticationToken(token, email, password))
        .then<Bluebird<never> | string>(handleAuthResult),
    )

const startUserAuth = (email: string, promptCode: () => Bluebird<string>, promptPass: () => Bluebird<string>): Bluebird<string | never> =>
  isVtexUser(email) ? vtexUserAuth(email, promptCode) : userAuth(email, promptPass)

const promptAccount = (): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      name: 'account',
      message: 'Account:',
      filter: (s) => s.trim(),
      validate: (s) => /^\s*[\w-]+\s*$/.test(s) || 'Please enter a valid account.',
    }),
  )
  .then<string>(prop('account'))

const promptLogin = (): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      name: 'login',
      message: 'Email:',
      filter: s => s.trim(),
      validate: s => validator.isEmail(s.trim()) || 'Please enter a valid email.',
    }),
  )
  .then<string>(prop('login'))

const promptPassword = (): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'password',
      name: 'password',
      message: 'Password:',
    }),
  )
  .then<string>(prop('password'))

const promptEmailCode = (): Bluebird<string> => {
  console.log(chalk.blue('!'), 'Please check your email - we\'ve sent you a temporary code.')
  return Promise.resolve(
    inquirer.prompt({
      name: 'code',
      message: 'Code:',
      validate: c => /\d{6}/.test(c) || 'Please enter the 6-digit numeric code you received in your email.',
    }),
  )
  .then<string>(prop('code'))
}

const promptWorkspaceInput = (account: string, token: string): Bluebird<string> =>
  Promise.resolve(
    inquirer.prompt({
      name: 'workspace',
      filter: s => s.trim(),
      message: 'New workspace name:',
      validate: s => /^(\s*|\s*[\w-]+\s*)$/.test(s) || 'Please enter a valid workspace.',
    })
    .then(({workspace}: {workspace: string}) => workspace),
  )
  .tap(workspace => workspacesClient().create(account, workspace))
  .catch(err => {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return promptWorkspaceInput(account, token)
    }
    throw new Error(err)
  })

const promptWorkspace = (account: string, token: string): Bluebird<string> => {
  const newWorkspace = 'Create new workspace...'
  const master = `master ${chalk.red('(read-only)')}`
  return workspacesClient().list(account)
    .then(workspaces =>
      inquirer.prompt({
        type: 'list',
        name: 'workspace',
        message: 'Workspaces:',
        choices: [
          newWorkspace,
          master,
          ...workspaces.map(w => w.name).filter(w => w !== 'master'),
          new inquirer.Separator(),
        ],
      }),
    )
    .then(({workspace}: {workspace: string}) => {
      switch (workspace) {
        case master:
          return 'master'
        case newWorkspace:
          return promptWorkspaceInput(account, token)
        default:
          return workspace
      }
    })
}

const promptUsePrevious = (): Bluebird<boolean> => {
  log.info(
    'Found previous credential!',
    `\n${chalk.bold('Email:')} ${chalk.green(cachedLogin)}`,
    `\n${chalk.bold('Account:')} ${chalk.green(cachedAccount)}`,
    `\n${chalk.bold('Workspace:')} ${chalk.green(cachedWorkspace)}`,
  )
  return Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to log in with the previous credential?',
    }),
  )
  .then<boolean>(prop('confirm'))
}

const saveCredentials = (login: string, account: string, token: string, workspace: string): void => {
  saveLogin(login)
  saveAccount(account)
  saveToken(token)
  saveWorkspace(workspace)
}

export default {
  description: 'Log into a VTEX account',
  handler: () => {
    return Promise.resolve(cachedLogin)
      .then(login => login ? promptUsePrevious() : false)
      .then(prev =>
        prev
          ? [cachedLogin, cachedAccount, cachedWorkspace]
          : mapSeries([promptLogin, promptAccount, () => null], fn => fn()),
      )
      .spread((login: string, account: string, workspace: string) => {
        log.debug('Start login', {login, account, workspace})
        return all([
          login,
          account,
          startUserAuth(login, promptEmailCode, promptPassword),
          workspace,
        ])
      })
      .spread((login: string, account: string, token: string, workspace: string) => {
        saveCredentials(login, account, token, workspace)
        const actualWorkspace = workspace || promptWorkspace(account, token)
        return all([login, account, token, actualWorkspace])
      })
      .spread((login: string, account: string, token: string, workspace: string) => {
        saveWorkspace(workspace)
        log.debug('Login successful', login, account, token, workspace)
        log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
      })
  },
}
