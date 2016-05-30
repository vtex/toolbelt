#!/usr/bin/env node
import minimist from 'minimist'
import chalk from 'chalk'
import {without} from 'ramda'
import log from './logger'
import notify from './update'
import {modules, commandTree} from './modules'
import {find, run, MissingRequiredArgsError} from 'findhelp'

const tree = commandTree(modules)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

try {
  const found = find(tree, without([VERBOSE], process.argv.slice(2)), minimist)
  if (found.command) {
    run.call(tree, found)
  } else {
    log.error('Command not found:', chalk.blue(process.argv.slice(2)))
  }
} catch (e) {
  switch (e.constructor) {
    case MissingRequiredArgsError:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    default:
      log.error('Something exploded :(')
      log.error(e)
  }
}
