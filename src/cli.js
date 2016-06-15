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
  if (found.command !== tree && !getToken()) {
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
      if (e.statusCode === 401) {
        log.error('Oops! There was an authentication error. Please login again.')
        // Try to login and re-issue the command.
        return run({command: tree.login})
        .then(main) // TODO: catch with different handler for second error
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
