import chalk from 'chalk'
import log from '../../logger'
import inquirer from 'inquirer'
import validator from 'validator'
import {VBaseClient} from '@vtex/api'
import userAgent from '../../user-agent'
import {startUserAuth} from '../../auth'
import {Promise, mapSeries, all} from 'bluebird'
import {
  getLogin,
  saveToken,
  saveLogin,
  getAccount,
  saveAccount,
  getWorkspace,
  saveWorkspace,
} from '../../conf'
import endpoint from '../../endpoint'
import timeout from '../../timeout'

const [account, login, workspace] = [getAccount(), getLogin(), getWorkspace()]

const client = (authToken) => new VBaseClient(endpoint('vbase'), {authToken, userAgent, timeout})

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

function promptWorkspaceInput (account, token) {
  const message = 'Please enter a valid workspace.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'workspace',
      message: 'New workspace name:',
      validate: s => /^(\s*|\s*[\w\-]+\s*)$/.test(s) || message,
      filter: s => s.trim(),
    })
  )
  .then(({workspace}) => workspace)
  .tap(workspace => client(token).create(account, workspace))
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
  return client(token).list(account)
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

function saveCredentials ({login, account, token, workspace}) {
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
      const actualWorkspace = workspace || promptWorkspace(account, token)
      return all([login, account, token, actualWorkspace])
    })
    .spread((login, account, token, workspace) => {
      const credentials = {login, account, token, workspace}
      log.debug('Login successful, saving credentials', credentials)
      saveCredentials(credentials)
      log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(login)} at workspace ${chalk.green(workspace)}`)
    })
  },
}
