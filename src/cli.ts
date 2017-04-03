#!/usr/bin/env node
import {without} from 'ramda'
import * as chalk from 'chalk'
import * as moment from 'moment'
import * as Promise from 'bluebird'
import * as minimist from 'minimist'
import 'any-promise/register/bluebird'
import {find, run as unboundRun, MissingRequiredArgsError} from 'findhelp'

import log from './logger'
import tree from './modules'
import notify from './update'
import {getToken} from './conf'
import loginCmd from './modules/auth/login'
import logoutCmd from './modules/auth/logout'
import switchCmd from './modules/auth/switch'
import whoamiCmd from './modules/auth/whoami'

global.Promise = Promise
const run = unboundRun.bind(tree)

// Setup logging
const VERBOSE = '--verbose'
const isVerbose = process.argv.indexOf(VERBOSE) >= 0
if (isVerbose) {
  log.level = 'debug'
  log['default'].transports.console['timestamp'] = () =>
    chalk.grey(moment().format('HH:mm:ss.SSS'))
}

if (process.env.NODE_ENV === 'development') {
  try {
    require('longjohn')
  } catch (e) {
    log.debug('Couldn\'t require longjohn. If you want long stack traces, run: npm install -g longjohn')
  }
}

// Show update notification if newer version is available
notify()

const checkCommandExists = found =>
  !found.command ? Promise.reject({name: 'CommandNotFound'}) : null

const checkLogin = found => {
  const whitelist = [tree, loginCmd, logoutCmd, switchCmd, whoamiCmd]
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
      return run({command: loginCmd}).then(main) // TODO: catch with different handler for second error
    }
    if (statusCode >= 400) {
      const {statusText, data} = e.response
      const message = data ? data.message : null
      const source = e.config.url
      log.error('API:', statusCode, statusText)
      if (message) {
        log.error('Message:', message)
      }
      log.debug(source)
      if (data) {
        log.debug(data)
      }
    } else {
      log.error('Oops! There was an unexpected API error.')
      if (isVerbose) {
        log.error(e.read ? e.read().toString('utf8') : e)
      }
    }
  } else if (code) {
    switch (code) {
      case 'ENOTFOUND':
        log.error('Connection failure :(')
        log.error('Please check your internet')
        break
      case 'EAI_AGAIN':
        log.error('A temporary failure in name resolution occurred :(')
        break
      default:
        log.error('Something exploded :(')
        if (e.config && e.config.url && e.config.method) {
          log.error(`${e.config.method} ${e.config.url}`)
        }
        if (isVerbose) {
          log.error(e)
        }
    }
  } else {
    switch (e.name) {
      case MissingRequiredArgsError.name:
        log.error('Missing required arguments:', chalk.blue(e.message))
        break
      case 'CommandNotFound':
        log.error('Command not found:', chalk.blue(...process.argv.slice(2)))
        break
      case 'InterruptionError':
        break
      default:
        log.error('Something exploded :(')
        if (isVerbose) {
          log.error(e)
        }
    }
  }

  process.exit()
}

try {
  main().catch(onError)
} catch (e) {
  onError(e)
}

process.on('unhandledRejection', onError)
