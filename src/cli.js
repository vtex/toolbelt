#!/usr/bin/env node
import 'babel-polyfill'
import 'any-promise/register/bluebird'
import minimist from 'minimist'
import chalk from 'chalk'
import {without} from 'ramda'
import {Promise} from 'bluebird'
import {find, run as unboundRun, MissingRequiredArgsError} from 'findhelp'
import log from './logger'
import notify from './update'
import {getToken} from './conf'
import tree from './modules'

const run = unboundRun.bind(tree)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

const checkCommandExists = found => {
  if (!found.command) {
    return Promise.reject({name: 'CommandNotFound'})
  }
}

const checkLogin = found => {
  const whitelist = [tree, tree.login, tree.logout]
  if (!getToken() && whitelist.indexOf(found.command) === -1) {
    log.debug('Requesting login before command:', process.argv.slice(2).join(' '))
    return run({command: tree.login})
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
  const {statusCode} = e
  if (statusCode) {
    if (statusCode === 401) {
      log.error('Oops! There was an authentication error. Please login again.')
      // Try to login and re-issue the command.
      return run({command: tree.login})
      .then(main) // TODO: catch with different handler for second error
    }
    if (statusCode >= 400) {
      try {
        const {code, message, exception} = e.error
        const {source, stackTrace} = exception
        log.error('API:', message, {statusCode, code})
	log.debug(source)
        log.debug(stackTrace)
        return
      } catch (e) {}
    }
    log.error('Oops! There was an unexpected API error.')
    log.error(e.read ? e.read().toString('utf8') : e)
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
