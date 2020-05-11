import axios from 'axios'
import os from 'os'
import help from '@oclif/plugin-help'
import * as Config from '@oclif/config'
import { HookKeyOrOptions } from '@oclif/config/lib/hooks'

import { envCookies } from '../../env'
import { CLIPreTasks } from '../../CLIPreTasks/CLIPreTasks'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { hrTimeToMs } from '../../lib/utils/hrTimeToMs'
import { updateNotify } from '../../update'
import log from '../../logger'
import * as pkg from '../../../package.json'
import * as conf from '../../conf'
import { checkAndOpenNPSLink } from '../../nps'
import { Metric } from '../../lib/metrics/MetricReport'
import authLogin from '../../modules/auth/login'
import { CommandError, SSEConnectionError } from '../../errors'
import { MetricNames } from '../../lib/metrics/MetricNames'
import { SessionManager } from '../../lib/session/SessionManager'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initTimeStartTime } = require('../../../bin/run')

let loginPending = false

const logToolbeltVersion = () => {
  log.debug(`Toolbelt version: ${pkg.version}`)
}

const checkLogin = async command => {
  const whitelist = [undefined, 'config', 'login', 'logout', 'switch', 'whoami', 'init', '-v', '--version', 'release']
  if (!SessionManager.getSingleton().checkValidCredentials() && whitelist.indexOf(command) === -1) {
    log.debug('Requesting login before command:', command)
    await authLogin({})
  }
}

const main = async (options?: HookKeyOrOptions<'init'>, calculateInitTime?: boolean) => {
  const cliPreTasksStart = process.hrtime()
  CLIPreTasks.getCLIPreTasks(pkg).runTasks()
  TelemetryCollector.getCollector().registerMetric({
    command: 'not-applicable',
    [MetricNames.CLI_PRE_TASKS_LATENCY]: hrTimeToMs(process.hrtime(cliPreTasksStart)),
  })

  // Show update notification if newer version is available
  updateNotify()

  const args = process.argv.slice(2)
  conf.saveEnvironment(conf.Environment.Production) // Just to be backwards compatible with who used staging previously

  logToolbeltVersion()
  log.debug('node %s - %s %s', process.version, os.platform(), os.release())
  log.debug(args)

  await checkLogin(options.id)

  await checkAndOpenNPSLink()

  if (calculateInitTime) {
    const initTime = process.hrtime(initTimeStartTime)
    const initTimeMetric: Metric = {
      command: options.id,
      [MetricNames.START_TIME]: hrTimeToMs(initTime),
    }
    TelemetryCollector.getCollector().registerMetric(initTimeMetric)
  }
}

export const onError = async (e: any) => {
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
      authLogin({}).then(() => {
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
      case CommandError.name:
        if (e.message && e.message !== '') {
          log.error(e.message)
        }
        break
      case SSEConnectionError.name:
        log.error(e.message ?? 'Connection to login server has failed')
        break
      default:
        log.error('Unhandled exception')
        log.error('Please report the issue in https://github.com/vtex/toolbelt/issues')
        log.error('Raw error: ', e)
    }
  }

  process.removeListener('unhandledRejection', onError)

  if (e instanceof CommandError) {
    process.exit(1)
  }

  const errorReport = TelemetryCollector.getCollector().registerError(e)
  log.error(`ErrorID: ${errorReport.metadata.errorId}`)
  process.exit(1)
}

export default async function(options: HookKeyOrOptions<'init'>) {
  // overwrite Help#showCommandHelp to customize help formating
  help.prototype.showCommandHelp = function(command: Config.Command, topics: Config.Topic[]) {
    const name = command.id
    const depth = name.split(':').length
    topics = topics.filter(t => t.name.startsWith(`${name}:`) && t.name.split(':').length === depth + 1)
    const title = command.description && this.render(command.description).split('\n')[0]
    if (title) console.log(`\n${title}\n`)
    console.log(this.command(command))
    console.log('')
    if (topics.length > 0) {
      console.log(this.topics(topics))
      console.log('')
    }
  }

  axios.interceptors.request.use(config => {
    if (envCookies()) {
      config.headers.Cookie = `${envCookies()}; ${config.headers.Cookie || ''}`
    }
    return config
  })

  process.on('unhandledRejection', onError)

  process.on('exit', () => {
    TelemetryCollector.getCollector().flush()
  })

  await main(options, true)
}
