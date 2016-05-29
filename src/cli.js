#!/usr/bin/env node
import minimist from 'minimist'
import printMessage from 'print-message'
import chalk from 'chalk'
import {without} from 'ramda'
import greeting from './greeting'
import log from './logger'
import notify from './update'
import {modules, commandTree} from './modules'
import {
  find,
  run,
  MissingRequiredArgsError,
} from './finder'

const tree = commandTree(modules)

const help = () => {
  return 'Usage: vtex <command> [options]'
}

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

try {
  const argv = without([VERBOSE], process.argv.slice(2))
  const found = find(tree, argv, minimist)
  if (found.command) {
    run(found)
  } else {
    found.argv._.length === 0
      ? printMessage(greeting)
      : log.error('Command not found:', chalk.blue(found.argv._))

    console.log(help(tree))
  }
} catch (e) {
  switch (e.constructor) {
    case MissingRequiredArgsError:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    default:
      log.error('Something exploded :(')
  }
}
