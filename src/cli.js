#!/usr/bin/env node
import minimist from 'minimist'
import chalk from 'chalk'
import {without} from 'ramda'
import {Promise} from 'bluebird'
import {find, run, MissingRequiredArgsError} from 'findhelp'
import {StatusCodeError} from 'request-promise/errors'
import log from './logger'
import notify from './update'
import {modules, commandTree} from './modules'
import {getAccount, getLogin, getToken} from './conf'

const tree = commandTree(modules)
run = run.bind(tree)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

const checkCommandExists = found => {
  if (!found.command) {
    return Promise.reject(log.error('Command not found:', chalk.blue(process.argv.slice(2))))
  }
}

const checkLogin = found => {
  if (found.command !== tree && !getToken()) {
    return run({command: tree.login, args: [{}]})
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
        const login = getLogin()
        log.error('Oops! There was an authentication error. Please login again.')
        // Try to login and re-issue the command.
        return run({command: tree.login, args: [login, {}]})
        .then(main) // TODO: catch with different handler for second error
      }
      break
    default:
      log.error('Something exploded :(')
      log.error(e)
  }
  process.exit()
}

Promise.try(main).catch(onError)
