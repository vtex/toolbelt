import chalk from 'chalk'
import log from '../logger'
import inquirer from 'inquirer'
import validator from 'validator'
import userAgent from '../user-agent'
import {startUserAuth} from '../auth'
import {VBaseClient} from '@vtex/vbase'
import {Promise, all, mapSeries} from 'bluebird'
import {
  clear,
  getLogin,
  saveLogin,
  saveToken,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
} from '../conf'

const [account, login, workspace] = [getAccount(), getLogin(), getWorkspace()]

const client = (token) => {
  return new VBaseClient({
    endpointUrl: 'BETA',
    authToken: token,
    userAgent: userAgent,
  })
}

function promptAccount () {
  const message = 'Please enter a valid account.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'account',
      message: 'Account:',
      validate: (s) => /^\s*[\w\-]+\s*$/.test(s) || message,
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

function promptWorkspace () {
  console.log(
    chalk.blue('!'),
    `Leave it blank if you're unsure, it will default to ${chalk.green('master')}.`
  )
  const message = 'Please enter a valid workspace.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'workspace',
      message: 'Workspace:',
      validate: (s) => /^(\s*|\s*[\w\-]+\s*)$/.test(s) || message,
      filter: (s) => {
        const trimmed = s.trim()
        return trimmed.length > 0 ? trimmed : 'master'
      },
    })
  )
  .then(({workspace}) => workspace)
}

function promptWorkspaceCreation (workspace) {
  console.log(
    chalk.blue('!'),
    `The workspace ${chalk.green(workspace)} doesn't exist.`
  )
  console.log(
    chalk.blue('!'),
    `If you choose ${chalk.red('no')}, it will default to ${chalk.green('master')}.`
  )
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: 'Do you wish to create it?',
  })
  .then(({confirm}) => confirm)
}

function promptUsePrevious () {
  log.info(
    'Found previous credential!',
    `\n${chalk.bold('Account:')} ${chalk.green(account)}`,
    `\n${chalk.bold('Email:')} ${chalk.green(login)}`,
    `\n${chalk.bold('Workspace:')} ${chalk.green(workspace)}`
  )
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: 'Do you want to log in with the previous credential?',
  })
  .then(({confirm}) => confirm)
}

function saveCredentials ({account, login, token, workspace}) {
  saveAccount(account)
  saveLogin(login)
  saveToken(token)
  saveWorkspace(workspace)
}

function workspaceExists (account, workspace, token) {
  return client(token).get(account, workspace)
  .then(() => true)
  .catch(res =>
    res.error && res.error.Code === 'NotFound'
      ? Promise.resolve(false)
      : Promise.reject(res)
  )
}

function createWorkspace (account, workspace, token) {
  return client(token).create(account, workspace)
  .then(() => workspace)
}

export default {
  login: {
    description: 'Log into a VTEX account',
    handler: () => {
      return Promise.resolve(login)
      .then(login => login ? promptUsePrevious() : false)
      .then(prev => prev
        ? [{account}, {login}, {workspace}]
        : mapSeries([promptAccount, promptLogin, () => ({})], a => a())
      )
      .spread(({account}, {login}, {workspace}) => {
        log.debug('Start login', {account, login, workspace})
        return all([
          account,
          login,
          startUserAuth(login, promptEmailCode, promptPassword),
          workspace,
        ])
      })
      .then(([account, login, token, workspace]) => {
        const actualWorkspace = workspace || promptWorkspace()
        return all([
          account,
          login,
          token,
          actualWorkspace,
        ])
      })
      .then(([account, login, token, workspace]) => {
        log.debug('Checking if workspace exists...')
        return workspaceExists(account, workspace, token)
        .then(exists => {
          if (exists) { return workspace }
          return promptWorkspaceCreation(workspace)
          .then(confirm => confirm
            ? createWorkspace(account, workspace, token)
            : 'master'
          )
        })
        .then(workspace => ({account, login, token, workspace}))
      })
      .then(credentials => {
        log.debug('Login successful, saving credentials', credentials)
        saveCredentials(credentials)
        log.info('Login successful!')
      })
      .catch(reason => {
        log.error(reason)
        process.exit(1)
      })
    },
  },
  logout: {
    description: 'Logout of the current VTEX account',
    handler: () => {
      log.debug('Clearing config file')
      clear()
      log.info('See you soon!')
      return Promise.resolve()
    },
  },
}
