#!/usr/bin/env node
import chalk from 'chalk'
import moment from 'moment'
import {without} from 'ramda'
import minimist from 'minimist'
import {Promise} from 'bluebird'
import 'any-promise/register/bluebird'
import {find, run as unboundRun, MissingRequiredArgsError} from 'findhelp'

import log from './logger'
import tree from './modules'
import notify from './update'
import {getToken, override} from './conf'
import loginCmd from './modules/auth/login'
import logoutCmd from './modules/auth/logout'
import switchCmd from './modules/auth/switch'

global.Promise = Promise
const run = unboundRun.bind(tree)

// Setup logging
const VERBOSE = '--verbose'
if (process.argv.indexOf(VERBOSE) >= 0) {
  log.level = 'debug'
  log.default.transports.console.timestamp = function () {
    return chalk.grey(moment().format('HH:mm:ss.SSS'))
  }
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

const checkCommandExists = found => {
  if (!found.command) {
    return Promise.reject({name: 'CommandNotFound'})
  }
}

const checkLogin = found => {
  const whitelist = [tree, loginCmd, logoutCmd, switchCmd]
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
    const args = command.args[command.args.length - 1]
    if (args.w || args.workspace) {
      override('workspace', args.w || args.workspace)
    }

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
      const {statusText, data, data: {message} = {}} = e.response
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
      log.error(e.read ? e.read().toString('utf8') : e)
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
        log.error(e)
    }
  } else {
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
  }

  process.exit()
}

Promise.try(main).catch(onError)

process.on('unhandledRejection', onError)
