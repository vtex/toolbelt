#!/usr/bin/env node
import minimist from 'minimist'
import chalk from 'chalk'
import {without} from 'ramda'
import greeting from './greeting'
import log from './logger'
import notify from './update'
import {modules, commandTree} from './modules'
import {help} from './helper'
import {
  find,
  run,
  MissingRequiredArgsError,
} from './finder'

const tree = commandTree(modules)

// Setup logging
const VERBOSE = '--verbose'
log.level = process.argv.indexOf(VERBOSE) >= 0 ? 'debug' : 'info'

// Show update notification if newer version is available
notify()

try {
  const found = find(tree, without([VERBOSE], process.argv.slice(2)), minimist)
  if (found.command) {
    run(found)
  } else {
    if (!(found.options.h || found.options.help)) {
      found.argv._.length
        ? log.error('Command not found:', chalk.blue(found.argv._))
        : greeting.map(g => log.info(g))
    }

    console.log('\n' + help(tree))
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
