import axios from 'axios'
import os from 'os'
import help from '@oclif/plugin-help'

import * as Config from '@oclif/config'
import { HookKeyOrOptions } from '@oclif/config/lib/hooks'
import { error } from '@oclif/errors'

import { envCookies } from '../../api/env'
import { CLIPreTasks } from '../../CLIPreTasks/CLIPreTasks'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { hrTimeToMs } from '../../lib/utils/hrTimeToMs'
import { updateNotify } from '../../update'
import log from '../../api/logger'
import * as pkg from '../../../package.json'
import * as conf from '../../api/conf'
import { checkAndOpenNPSLink } from '../../nps'
import { Metric } from '../../api/metrics/MetricReport'
import authLogin from '../../modules/auth/login'
import { MetricNames } from '../../api/metrics/MetricNames'
import { SessionManager } from '../../api/session/SessionManager'
import { SSEConnectionError } from '../../api/error/errors'
import { ErrorReport } from '../../api/error/ErrorReport'
import { FeatureFlag } from '../../api/modules/featureFlag'
import { getHelpSubject, CommandI, renderCommands } from './utils'
import * as fse from 'fs-extra'
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initTimeStartTime } = require('../../../bin/run')

let loginPending = false

const logToolbeltVersion = () => {
  log.debug(`Toolbelt version: ${pkg.version}`)
}

const checkLogin = async (command: string) => {
  /**
   * Commands for which previous login is not necessary. There's some exceptions:
   * - link: It's necessary to be logged in, but there's some login logic there before running the link per se
   */
  const allowedList = [
    undefined,
    'config',
    'login',
    'logout',
    'switch',
    'whoami',
    'init',
    '-v',
    '--version',
    'release',
    'link',
  ]

  if (!SessionManager.getSingleton().checkValidCredentials() && allowedList.indexOf(command) === -1) {
    log.debug('Requesting login before command:', command)
    await authLogin({})
  }
}

const checkAndFixSymlink = async (options) => {
  try {
    require('vtex')
  } catch (err) {
    log.error('Import VTEX error, trying to autofix...')
    try {
      await fse.symlink(options.config.root, path.join(options.config.root, 'node_modules', 'vtex'))
    } catch (err2) {
      log.error('Failed to create symbolic link:', err2.message)
    }
    log.info('Problem fixed. Please, run the command again')
    process.exit(1)
  }
  log.debug('Import VTEX OK')
}

const main = async (options?: HookKeyOrOptions<'init'>, calculateInitTime?: boolean) => {
  const cliPreTasksStart = process.hrtime()
  CLIPreTasks.getCLIPreTasks(pkg).runTasks(options.id)
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

  await checkAndFixSymlink(options)

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
  } else if (ErrorReport.isFlowIssue(e)) {
    if (e.message && e.message !== '') {
      log.error(e.message)
    }
  } else if (e instanceof SSEConnectionError) {
    log.error(e.message)
  } else {
    log.error('Unhandled exception')
    log.error('Please report the issue in https://github.com/vtex/toolbelt/issues')
    log.error('Raw error: ', e)
  }

  process.removeListener('unhandledRejection', onError)

  const errorReport = TelemetryCollector.getCollector().registerError(e)

  if (!ErrorReport.isFlowIssue(e)) {
    log.error(`ErrorID: ${errorReport.metadata.errorId}`)
  }

  process.exit(1)
}

export default async function(options: HookKeyOrOptions<'init'>) {
  // overwrite Help#showCommandHelp to customize help formating
  help.prototype.showCommandHelp = function(command: Config.Command) {
    let topics = this._topics
    topics = topics.filter(t => this.opts.all || !t.hidden)
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

  help.prototype.showHelp = function(_argv: string[]) {
    const subject = getHelpSubject(_argv)
    if (subject) {
      const command = this.config.findCommand(subject)
      if (command) {
        this.showCommandHelp(command)
        return
      }

      const topic = this.config.findTopic(subject)
      if (topic) {
        this.showTopicHelp(topic)
        return
      }

      error(`command ${subject} not found`)
    }

    const commandsGroup: Record<string, number> = FeatureFlag.getSingleton().getFeatureFlagInfo<Record<string, number>>(
      'COMMANDS_GROUP'
    )
    const commandsId: Record<number, string> = FeatureFlag.getSingleton().getFeatureFlagInfo<Record<number, string>>(
      'COMMANDS_GROUP_ID'
    )
    const commandsGroupLength: number = Object.keys(commandsId).length

    const commands = this.config.commands
      .filter(c => !c.id.includes(':'))
      .map(c => {
        return { name: c.id, description: c.description }
      })
    const topics = this.config.topics
      .filter(t => !t.name.includes(':'))
      .map(c => {
        return { name: c.name, description: c.description }
      })
    const allCommands = commands.concat(topics)

    const groups: CommandI[][] = Object.keys(commandsId).map(_ => [])

    const cachedObject: Map<string, boolean> = new Map<string, boolean>()

    allCommands.forEach((command: CommandI) => {
      if (cachedObject.has(command.name)) return
      cachedObject.set(command.name, true)

      const commandGroupId = commandsGroup[command.name]

      if (commandGroupId) {
        groups[commandGroupId].push(command)
      } else {
        groups[commandsGroupLength - 1].push(command)
      }
    })

    const renderedCommands = renderCommands(commandsId, groups, {
      render: this.render,
      opts: this.opts,
      config: this.config,
    })

    console.log(renderedCommands)
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
