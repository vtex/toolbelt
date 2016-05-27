#!/usr/bin/env node
import yargs from 'yargs'
import updateNotifier from 'update-notifier'
import Configstore from 'configstore'
import vtexsay from 'vtexsay'
import pkg from '../package.json'
import winston from './logger'
import {
  getCommandList,
  getHandler,
} from './modules'

const log = winston
const start = new Date()
const conf = new Configstore(pkg.name)
const command = () => yargs.argv._[0]

// Setup logging
if (yargs.boolean('verbose').alias('V', 'verbose').argv.verbose) {
  log.level = 'debug'
}

// Show update notification if newer version is available
updateNotifier({pkg, updateCheckInterval: 0})
.notify({defer: false})

// Build commands from modules
getCommandList().forEach((c) => {
  const {command, alias, describe, builder} = c
  log.debug('Add command', command, alias, describe, builder)
  yargs.command(command, describe, builder)
  if (alias) {
    log.debug('Add alias', alias, 'for command', command)
    yargs.command(alias, false)
  }
})

// Be polite :)
if (command() == null) {
  console.log(vtexsay('Welcome to VTEX I/O'))
}

// Setup generic options
yargs
.version()
.describe('V', 'Show all logs')
.alias('v', 'version')
.help('help')
.alias('h', 'help')
.usage('Usage: vtex <command>')
.demand(1)
.strict()

// Invoke command handler
getHandler(command())(yargs.argv, log, conf, () => {
  log.debug('Session time', new Date() - start)
  process.exit(0)
})
