import chalk from 'chalk'
import {ID} from '@vtex/api'
import inquirer from 'inquirer'
import validator from 'validator'
import {Promise, mapSeries, all} from 'bluebird'

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

let workspaces = safeGetClient('workspaces')

const vtexid = new ID(endpoint('vtexid'), {
  authToken: 'abc123',
  userAgent: `Toolbelt/${version}`,
})
const [account, login, workspace] = [getAccount(), getLogin(), getWorkspace()]

function safeGetClient (client) {
  const clients = '../../clients.js'
  try {
    delete require.cache[require.resolve(clients)]
    return require(clients)[client]
  } catch (e) {}
}

function isVtexUser (email) {
  return email.indexOf('@vtex.com') >= 0
}

function handleAuthResult (result) {
  if (result.authStatus !== 'Success') {
    return Promise.reject(result.authStatus)
  }
  return result.authCookie.Value
}

function vtexUserAuth (email, prompt) {
  let token
  return vtexid.getTemporaryToken()
  .then(t => { token = t })
  .then(() => [token, email])
  .tap(() => log.debug('Sending code to email', {token, email}))
  .spread(vtexid.sendCodeToEmail.bind(vtexid))
  .then(prompt)
  .then(({code}) => [token, email, code])
  .tap(() => log.debug('Getting auth token with email code', {token, email}))
  .spread(vtexid.getEmailCodeAuthenticationToken.bind(vtexid))
  .then(handleAuthResult)
}

function userAuth (email, prompt) {
  let token
  return vtexid.getTemporaryToken()
  .then(t => { token = t })
  .then(prompt)
  .then(({password}) => [token, email, password])
  .tap(() => log.debug('Getting auth token with password', {token, email}))
  .spread(vtexid.getPasswordAuthenticationToken.bind(vtexid))
  .then(handleAuthResult)
}

function startUserAuth (email, promptCode, promptPass) {
  return isVtexUser(email) ? vtexUserAuth(email, promptCode) : userAuth(email, promptPass)
}

function promptAccount () {
  const message = 'Please enter a valid account.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'account',
      message: 'Account:',
      validate: (s) => /^\s*[\w-]+\s*$/.test(s) || message,
      filter: (s) => s.trim(),
    })
  )
}

function promptLogin () {
  const message = 'Please enter a valid email.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'login',
      message: 'Email:',
      validate: (s) => validator.isEmail(s.trim()) || message,
      filter: (s) => s.trim(),
    })
  )
}

function promptPassword () {
  return inquirer.prompt({
    type: 'password',
    name: 'password',
    message: 'Password:',
  })
}

function promptEmailCode () {
  console.log(chalk.blue('!'), 'Please check your email - we\'ve sent you a temporary code.')
  const message = 'Please enter the 6-digit numeric code you received in your email.'
  return inquirer.prompt({
    name: 'code',
    message: 'Code:',
    validate: c => /\d{6}/.test(c) || message,
  })
}

function promptWorkspaceInput (account, token) {
  const message = 'Please enter a valid workspace.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'workspace',
      message: 'New workspace name:',
      validate: s => /^(\s*|\s*[\w-]+\s*)$/.test(s) || message,
      filter: s => s.trim(),
    })
  )
  .then(({workspace}) => workspace)
  .tap(workspace => workspaces.create(account, workspace))
  .catch(err => {
    if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
      log.error(err.response.data.message)
      return promptWorkspaceInput(account, token)
    }
    throw new Error(err)
  })
}

function promptWorkspace (account, token) {
  const newWorkspace = 'Create new workspace...'
  const master = `master ${chalk.red('(read-only)')}`
  return workspaces.list(account)
  .then(workspaces => {
    const workspaceList = [
      newWorkspace,
      master,
      ...workspaces.map(w => w.name).filter(w => w !== 'master'),
      new inquirer.Separator(),
    ]
    return inquirer.prompt({
      type: 'list',
      name: 'workspace',
      message: 'Workspaces:',
      choices: workspaceList,
    })
  })
  .then(({workspace}) => {
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

function promptUsePrevious () {
  log.info(
    'Found previous credential!',
    `\n${chalk.bold('Email:')} ${chalk.green(login)}`,
    `\n${chalk.bold('Account:')} ${chalk.green(account)}`,
    `\n${chalk.bold('Workspace:')} ${chalk.green(workspace)}`
  )
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: 'Do you want to log in with the previous credential?',
  })
  .then(({confirm}) => confirm)
}

function saveCredentials (login, account, token, workspace) {
  saveLogin(login)
  saveAccount(account)
  saveToken(token)
  saveWorkspace(workspace)
}

export default {
  description: 'Log into a VTEX account',
  handler: () => {
    return Promise.resolve(login)
    .then(login => login ? promptUsePrevious() : false)
    .then(prev => prev
      ? [{login}, {account}, {workspace}]
      : mapSeries([promptLogin, promptAccount, () => ({})], a => a())
    )
    .spread(({login}, {account}, {workspace}) => {
      log.debug('Start login', {login, account, workspace})
      return all([
        login,
        account,
        startUserAuth(login, promptEmailCode, promptPassword),
        workspace,
      ])
    })
    .spread((login, account, token, workspace) => {
      saveCredentials(login, account, token, workspace)
      workspaces = safeGetClient('workspaces')
      const actualWorkspace = workspace || promptWorkspace(account, token)
      return all([login, account, token, actualWorkspace])
    })
    .spread((login, account, token, workspace) => {
      saveWorkspace(workspace)
      log.debug('Login successful', login, account, token, workspace)
      log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
    })
  },
}
