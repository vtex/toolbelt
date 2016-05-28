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
  CommandNotFoundError,
  MissingRequiredArgsError,
} from './runner'

const argv = minimist(process.argv.slice(2), {boolean: ['verbose']})
const tree = commandTree(modules)

// Setup logging
log.level = argv.verbose ? 'debug' : 'info'

// Show usage when ran without commands
if (argv._.length === 0) {
  printMessage(greeting)
  process.exit(0)
}

// Show update notification if newer version is available
notify()

try {
  const command = find(tree, argv)
  log.debug('Found command', command.name)
  run(command)
} catch (e) {
  switch (e.constructor) {
    case CommandNotFoundError:
      log.error('Command not found:', chalk.blue(e.message || argv._))
      break
    case MissingRequiredArgsError:
      log.error('Missing required arguments:', chalk.blue(e.message))
      break
    default:
      log.error('Something exploded :(')
  }
}
