import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import validator from 'validator'
import chalk from 'chalk'
import {startUserAuth} from '../api'
import log from '../logger'
import conf from '../conf'

function promptLogin (login) {
  if (validator.isEmail(login.toString())) {
    return Promise.resolve({login})
  }
  const message = 'Please enter a valid email.'
  return inquirer.prompt({
    name: 'login',
    message: 'Email:',
    validate: (s) => validator.isEmail(s) || message,
  })
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

function saveAccount (account) {
  conf.set('account', account)
}

function saveLogin (login) {
  conf.set('login', login)
}

function saveToken (token) {
  conf.set('token', token)
}

export default {
  login: {
    requiredArgs: 'account',
    optionalArgs: 'login',
    description: 'Log into a VTEX account',
    handler: (account, login) => {
      log.debug('Starting login', account)
      saveAccount(account)
      promptLogin(login)
      .then(({login}) => {
        log.debug('Attempt login with email', login)
        saveLogin(login)
        return startUserAuth(login, promptEmailCode, promptPassword)
      })
      .then(token => {
        log.debug('Logged in with token', token)
        saveToken(token)
        log.info('Login successful')
        log.info('Creating workspace...')
      })
      .catch(reason => {
        log.error(reason)
      })
    },
  },
  logout: {
    description: 'Logout of the current VTEX account',
    handler: () => {
      log.debug('Starting logout')
      log.info('See you soon!')
    },
  },
}
