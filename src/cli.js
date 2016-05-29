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
  MissingRequiredArgsError,
} from './finder'

const tree = commandTree(modules)
const argv = minimist(process.argv.slice(2), {boolean: ['verbose']})

// Setup logging
log.level = argv.verbose ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

try {
  const found = find(tree, argv)
  log.debug('Using options', found.options)
  if (found.command) {
    log.debug('Found command', found.name)
    run(found)
  } else {
    printMessage(greeting)
    log.error('Command not found:', chalk.blue(argv._))
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
