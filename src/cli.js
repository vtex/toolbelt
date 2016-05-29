#!/usr/bin/env node
import minimist from 'minimist'
import printMessage from 'print-message'
import chalk from 'chalk'
import greeting from './greeting'
import log from './logger'
import notify from './update'
import {modules, commandTree} from './modules'
import {
  find,
  run,
  findOptions,
  optionsByType,
  MissingRequiredArgsError,
} from './finder'

const tree = commandTree(modules)

// Setup logging
log.level = minimist(
  process.argv.slice(2),
  optionsByType(findOptions(tree))
).verbose ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

try {
  const found = find(tree, process.argv.slice(2), minimist)
  log.debug('Options', found.options)
  log.debug('argv', found.argv)
  if (found.command) {
    log.debug('Found command', found.name)
    run(found)
  } else if (found.argv._.length === 0) {
    printMessage(greeting)
  } else {
    log.error('Command not found:', chalk.blue(found.argv._))
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
