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
import {getAccount, getLogin} from './conf'

const tree = commandTree(modules)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

const main = () => {
  const found = find(tree, without([VERBOSE], process.argv.slice(2)), minimist)
  if (!found.command) {
    return log.error('Command not found:', chalk.blue(process.argv.slice(2)))
  }
  return run.call(tree, found)
}

const onError = e => {
  switch (e.name) {
    case MissingRequiredArgsError.name:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    case StatusCodeError.name:
      if (e.statusCode === 401) {
        const account = getAccount()
        const login = getLogin()
        if (account) {
          log.error('Oops! There was an authentication error. Please login again.')
          // Try to login and re-issue the command.
          return run.call(tree, {command: tree.login, args: [account, login, {}]})
          .then(main) // TODO: catch with different handler for second error
        }
        log.error('Oops! There was an authentication error. Please login first.')
      }
      break
    default:
      log.error('Something exploded :(')
      log.error(e)
  }
  process.exit()
}

Promise.try(main).catch(onError)
