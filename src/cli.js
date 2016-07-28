#!/usr/bin/env node
import minimist from 'minimist'
import chalk from 'chalk'
import {without} from 'ramda'
import {Promise} from 'bluebird'
import {find, run as unboundRun, MissingRequiredArgsError} from 'findhelp'
import {StatusCodeError} from 'request-promise/errors'
import log from './logger'
import notify from './update'
import tree from './modules'
import {getToken} from './conf'

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
  .then(run)
}

const onError = e => {
  switch (e.name) {
    case MissingRequiredArgsError.name:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    case StatusCodeError.name:
      const {statusCode} = e
      if (statusCode === 401) {
        log.error('Oops! There was an authentication error. Please login again.')
        // Try to login and re-issue the command.
        return run({command: tree.login})
        .then(main) // TODO: catch with different handler for second error
      }
      if (statusCode >= 500) {
        try {
          const {code, exception} = e.error
          const {message, stackTrace} = exception
          log.error('There was an API error.', {statusCode, code})
          log.error(message)
          log.debug(stackTrace)
          break
        } catch (e) {}
      }
      log.error('Oops! There was an unexpected API error.')
      log.error(e)
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
