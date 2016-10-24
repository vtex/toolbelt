#!/usr/bin/env node
import chalk from 'chalk'
import log from './logger'
import tree from './modules'
import {without} from 'ramda'
import notify from './update'
import minimist from 'minimist'
import {getToken} from './conf'
import {Promise} from 'bluebird'
import 'any-promise/register/bluebird'
import loginCmd from './modules/auth/login'
import logoutCmd from './modules/auth/logout'
import {find, run as unboundRun, MissingRequiredArgsError} from 'findhelp'

global.Promise = Promise
const run = unboundRun.bind(tree)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

if (process.env.NODE_ENV === 'development') {
  try {
    require('longjohn')
  } catch (e) {
    log.debug('Couldn\'t require longjohn. If you want long stack traces, run: npm install -g longjohn')
  }
}

// Show update notification if newer version is available
notify()

const checkCommandExists = found => {
  if (!found.command) {
    return Promise.reject({name: 'CommandNotFound'})
  }
}

const checkLogin = found => {
  const whitelist = [tree, loginCmd, logoutCmd]
  if (!getToken() && whitelist.indexOf(found.command) === -1) {
    log.debug('Requesting login before command:', process.argv.slice(2).join(' '))
    return run({command: loginCmd})
  }
}

const main = () => {
  return Promise.resolve(find(tree, without([VERBOSE], process.argv.slice(2)), minimist))
  .tap(checkCommandExists)
  .tap(checkLogin)
  .then(command => {
    const maybePromise = run(command)
    if (!maybePromise || !maybePromise.then) {
      log.warn('Command handlers should return a Promise.')
    }
    return maybePromise
  })
}

const onError = e => {
  const statusCode = e.response ? e.response.status : null
  const code = e.code || null

  if (statusCode) {
    if (statusCode === 401) {
      log.error('Oops! There was an authentication error. Please login again.')
      // Try to login and re-issue the command.
      return run({command: loginCmd})
      .then(main) // TODO: catch with different handler for second error
    }
    if (statusCode >= 400) {
      try {
        const {statusText, data: stackTrace} = e.response
        const {message} = stackTrace
        const source = e.config.url
        log.error('API:', statusCode, statusText)
        log.error('Message:', message)
        log.debug(source)
        log.debug(stackTrace)
      } catch (e) {}
    } else {
      log.error('Oops! There was an unexpected API error.')
      log.error(e.read ? e.read().toString('utf8') : e)
    }
    return
  }

  if (code && code === 'ENOTFOUND') {
    log.error('Connection failure :(')
    log.error('Please check your internet')
    return
  }

  if (code && code === 'EAI_AGAIN') {
    log.error('A temporary failure in name resolution occurred :(')
    return
  }

  switch (e.name) {
    case MissingRequiredArgsError.name:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    case 'CommandNotFound':
      log.error('Command not found:', chalk.blue(process.argv.slice(2)))
      break
    default:
      log.error('Something exploded :(')
      log.error(e)
  }

  process.exit()
}

Promise.try(main).catch(onError)

process.on('unhandledRejection', e => {
  log.error('Unhandled rejection', e)
  process.exit()
})
