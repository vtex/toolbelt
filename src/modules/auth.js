import inquirer from 'inquirer'
import {Promise, all} from 'bluebird'
import validator from 'validator'
import chalk from 'chalk'
import {startUserAuth, createSandbox} from '../api'
import log from '../logger'
import {saveAccount, saveLogin, saveToken, clear} from '../conf'

function promptLogin (login = '') {
  if (validator.isEmail(login.toString())) {
    return Promise.resolve({login})
  }
  const message = 'Please enter a valid email.'
  return Promise.try(() =>
    inquirer.prompt({
      name: 'login',
      message: 'Email:',
      validate: (s) => validator.isEmail(s) || message,
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

function saveCredentials (account, login, token) {
  saveAccount(account)
  saveLogin(login)
  saveToken(token)
}

export default {
  login: {
    requiredArgs: 'account',
    optionalArgs: 'login',
    description: 'Log into a VTEX account',
    handler: (account, login) => {
      return promptLogin(login)
      .then(({login}) => {
        log.debug('Start login', {account, login})
        return all([account, login, startUserAuth(login, promptEmailCode, promptPassword)])
      })
      .tap(([account, login, token]) => {
        log.debug('Login successful, saving credentials', {account, login, token})
        saveCredentials(account, login, token)
        log.debug('Creating sandbox workspace...')
      })
      .spread(createSandbox)
      .then(res => {
        log.debug('Created sandbox', res)
        log.info('Login successful! 👍')
      })
      .catch(reason => {
        log.error(reason)
      })
    },
  },
  logout: {
    description: 'Logout of the current VTEX account',
    handler: () => {
      log.debug('Clearing config file')
      clear()
      log.info('See you soon! ✋')
    },
  },
}
