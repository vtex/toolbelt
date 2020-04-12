#!/usr/bin/env node
import 'v8-compile-cache'
import axios from 'axios'
import chalk from 'chalk'
import { all as clearCachedModules } from 'clear-module'
import { CommandNotFoundError, find, MissingRequiredArgsError, run as unboundRun } from 'findhelp'
import os from 'os'
import path from 'path'
import { without } from 'ramda'

import * as pkg from '../package.json'
import * as conf from './conf'
import { envCookies } from './env'
import { CommandError, SSEConnectionError, UserCancelledError } from './errors'
import log from './logger'
import { checkAndOpenNPSLink } from './nps'
import notify from './update'
import tree from './tree'
import { hrTimeToMs, VERBOSE, isVerbose } from './utils'
import { Metric } from './metrics/MetricReport'
import { TelemetryCollector } from './telemetry/TelemetryCollector'
import { CLIPrechecker } from './CLIPreChecker/CLIPrechecker'
import { Token } from '../lib/local/Token'

const initTimeStartTime = process.hrtime()

const run = command => Promise.resolve(unboundRun.call(tree, command, path.join(__dirname, 'modules')))

const logToolbeltVersion = () => {
  log.debug(`Toolbelt version: ${pkg.version}`)
}

const loginCmd = tree.login
let loginPending = false

const checkLogin = args => {
  const first = args[0]
  const whitelist = [undefined, 'config', 'login', 'logout', 'switch', 'whoami', 'init', '-v', '--version', 'release']
  const token = new Token(conf.getToken())
  if (!token.isValid() && whitelist.indexOf(first) === -1) {
    log.debug('Requesting login before command:', args.join(' '))
    return run({ command: loginCmd })
  }
}

const main = async (calculateInitTime = false) => {
  const args = process.argv.slice(2)
  conf.saveEnvironment(conf.Environment.Production) // Just to be backwards compatible with who used staging previously

  logToolbeltVersion()
  log.debug('node %s - %s %s', process.version, os.platform(), os.release())
  log.debug(args)

  await checkLogin(args)

  const command = await find(tree, without([VERBOSE], args))

  if (isVerbose) {
    const findWhoami = await find(tree, ['whoami'])
    if (command.command !== findWhoami.command) {
      await run(findWhoami)
    }
  }

  await checkAndOpenNPSLink()

  if (calculateInitTime) {
    const initTime = process.hrtime(initTimeStartTime)
    const initTimeMetric: Metric = {
      command: command.command.alias || command.command.path,
      initTime: hrTimeToMs(initTime),
    }
    TelemetryCollector.getCollector().registerMetric(initTimeMetric)
  }

  const commandStartTime = process.hrtime()
  await run(command)
  const commandLatency = process.hrtime(commandStartTime)
  const commandLatencyMetric: Metric = {
    command: command.command.alias || command.command.path,
    latency: hrTimeToMs(commandLatency),
  }
  TelemetryCollector.getCollector().registerMetric(commandLatencyMetric)
}

const onError = async (e: any) => {
  const status = e?.response?.status
  const statusText = e?.response?.statusText
  const headers = e?.response?.headers
  const data = e?.response?.data
  const code = e?.code || null

  if (headers) {
    log.debug('Failed request headers:', headers)
  }

  if (status === 401) {
    if (!loginPending) {
      log.error('There was an authentication error. Please login again')
      // Try to login and re-issue the command.
      loginPending = true
      return run({ command: loginCmd }).then(() => {
        clearCachedModules()
        main()
      }) // TODO: catch with different handler for second error
    }
    return // Prevent multiple login attempts
  }

  if (status) {
    if (status >= 400) {
      const message = data ? data.message : null
      const source = e.config.url
      log.error('API:', status, statusText)
      log.error('Source:', source)
      if (e.config?.method) {
        log.error('Method:', e.config.method)
      }

      if (message) {
        log.error('Message:', message)
        log.debug('Raw error:', data)
      } else {
        log.error('Raw error:', {
          data,
          source,
        })
      }
    } else {
      log.error('Oops! There was an unexpected error:')
      log.error(e.read ? e.read().toString('utf8') : data)
    }
  } else if (code) {
    switch (code) {
      case 'ENOTFOUND':
        log.error('Connection failure :(')
        log.error('Please check your internet')
        break
      case 'EAI_AGAIN':
        log.error('A temporary failure in name resolution occurred :(')
        break
      default:
        log.error('Unhandled exception')
        log.error('Please report the issue in https://github.com/vtex/toolbelt/issues')
        if (e.config?.url && e.config?.method) {
          log.error(`${e.config.method} ${e.config.url}`)
        }
        log.debug(e)
    }
  } else {
    switch (e.name) {
      case MissingRequiredArgsError.name:
        log.error('Missing required arguments:', chalk.blue(e.message))
        break
      case CommandNotFoundError.name:
        log.error('Command not found:', chalk.blue(...process.argv.slice(2)))
        break
      case CommandError.name:
        if (e.message && e.message !== '') {
          log.error(e.message)
        }
        break
      case SSEConnectionError.name:
        log.error(e.message ?? 'Connection to login server has failed')
        break
      case UserCancelledError.name:
        log.debug('User Cancelled')
        break
      default:
        log.error('Unhandled exception')
        log.error('Please report the issue in https://github.com/vtex/toolbelt/issues')
        log.error('Raw error:', e)
    }
  }

  process.removeListener('unhandledRejection', onError)

  const errorReport = TelemetryCollector.getCollector().registerError(e)
  log.error(`ErrorID: ${errorReport.errorId}`)
  await TelemetryCollector.getCollector().flush()
  process.exit(1)
}

axios.interceptors.request.use(config => {
  if (envCookies()) {
    config.headers.Cookie = `${envCookies()}; ${config.headers.Cookie || ''}`
  }
  return config
})

process.on('unhandledRejection', onError)

const start = async () => {
  CLIPrechecker.getCLIPrechecker(pkg).runChecks()

  // Show update notification if newer version is available
  notify()

  try {
    await main(true)
    await TelemetryCollector.getCollector().flush()
  } catch (err) {
    await onError(err)
  }
}

start()
