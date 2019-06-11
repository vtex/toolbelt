import chalk from 'chalk'
import { join } from 'path'
import * as progress from 'progress-string'
import { any as ramdaAny, compose, filter, isEmpty, keys, map, path, replace, sort } from 'ramda'
import { stdout as singleLineLog } from 'single-line-log'
import { sprintf } from 'sprintf-js'
import { createLogger, format, Logger, transports } from 'winston'
import  * as Transport from 'winston-transport'

import { name as pkgName, version as pkgVersion } from '../package.json'
import { logger as colossusLogger } from './clients'
import { configDir } from './conf'
import { FINAL_MESSAGES } from './logger-scopes'

// Setup logging
const VERBOSE = '--verbose'
const UNINDEXED = '__unindexed'
const isVerbose = process.argv.indexOf(VERBOSE) >= 0
const isLink = process.argv.indexOf('link') >= 0
const SPECIAL_SENDERS: RegExp[] = []
const SPECIAL_MESSAGES: RegExp[] = [/^Available routes/, /^Available service/, /^You can try out/]
const useFancyLogger = isLink && !isVerbose

const { combine, timestamp, colorize } = format
const bar = progress({
  width: Math.floor(0.75 * 0.5 * process.stdout.columns) - 4,
  total: 100,
  style: (complete, incomplete) => {
    return '#'.repeat(complete.length) + '' + ' '.repeat(incomplete.length)
  },
})

export const DEBUG_LOG_FILE_PATH = join(configDir, 'vtex_debug.txt')
const INDENTATION = '    '
const getProgressBar = (value) => {
  return `  [${bar(value)}] ${value}%`
}
const pkgId = `${pkgName}@${pkgVersion}`

class SimpleConsoleTransport extends Transport {
  constructor(opts) {
    super(opts)
  }

  public log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })
    if (info.message) {
      console.log(info.message)
    }
    callback()
  }
}

class FancyConsoleTransport extends Transport {
  public logs: any
  private renderedLogs: string

  constructor(opts) {
    super(opts)
    this.logs = {}
    this.renderedLogs = ''
  }

  public log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })
    const { message, clear=false, clearAll=false, level, progress: progressBarSpecs, sender } = info
    const { append=this.shouldAppend(sender, level, message) } = info
    let { scope } = info
    if (this.isSpecial(sender, message)) {
      scope = FINAL_MESSAGES
    }
    const newLogText = this.formatMessage(message, level)
    let newProgressBarText = ''
    let newProgressBarValue = ''
    let newProgressBarSpecs = {}
    if (progressBarSpecs) {
      const { text, value } = progressBarSpecs
      newProgressBarText = text
      newProgressBarValue = value !== undefined ? getProgressBar(value) : undefined
      newProgressBarSpecs = { text: newProgressBarText, value: newProgressBarValue }
    }
    if (clearAll) {
      this.clearAll()
    }
    if (clear) {
      this.clear(newLogText, newProgressBarSpecs, scope)
    } else if (append) {
      this.append(newLogText, newProgressBarSpecs, scope)
    } else {
      this.tempAppend(newLogText, newProgressBarSpecs, scope)
    }
    this.renderAll()
    callback()
  }

  private formatMessage(message: string, level: string) {
    if (!message) {
      return ''
    }
    if (this.isWarning(level)) {
      return `- ${chalk.yellow('warning')}: ${message}`
    }
    if (this.isError(level)) {
      return `- ${chalk.red('error')}: ${message}`
    }
    return `- ${message}`
  }

  private isWarning(level) {
    return ['warn'].indexOf(level) >= 0
  }

  private isError(level) {
    return ['error'].indexOf(level) >= 0
  }

  private isSpecial(sender: string | undefined, message: string) {
    if (!sender) {
      return false
    }
    const hasSpecialSender = compose<RegExp[], boolean[], boolean>(
      ramdaAny(x => !!x),
      map((x: RegExp) => x.test(sender))
    )(SPECIAL_SENDERS)

    const hasSpecialMessage = compose<RegExp[], boolean[], boolean>(
        ramdaAny(x => !!x),
        map((x: RegExp) => x.test(message))
      )(SPECIAL_MESSAGES)

    return hasSpecialSender || hasSpecialMessage
  }

  private shouldAppend(sender: string, level: string, message: string) {
    return this.isError(level) || this.isWarning(level) || this.isSpecial(sender, message)
  }

  private clear(
    newLogText='',
    newProgressBarSpecs={},
    scope=UNINDEXED
  ) {
    this.logs[scope] = {}
    this.setTimestamp(scope)
    if (newLogText) {
      this.logs[scope].text = newLogText
    }
    if (newProgressBarSpecs) {
      this.logs[scope].progress = newProgressBarSpecs
    }
  }

  private clearAll() {
    singleLineLog()
    console.log(replace(/\n\s*$/, '', this.renderedLogs))
    this.logs = {}
  }

  private append(
    newLogText?: string,
    newProgressBarSpecs?: any,
    scope=UNINDEXED
  ) {
    if (!this.logs[scope]) {
      this.logs[scope] = {}
      this.setTimestamp(scope)
    }
    if (newProgressBarSpecs) {
      this.setProgress(scope, newProgressBarSpecs)
    }
    const indentation = !isEmpty(path([scope, 'progress'], this.logs)) ? INDENTATION : ''
    if (path([scope, 'text'], this.logs)) {
      this.logs[scope].text = newLogText ?
        `${this.logs[scope].text}${indentation}${newLogText}\n` :
        this.logs[scope].text
    } else {
      this.logs[scope].text = newLogText ?
        `${indentation}${newLogText}\n` :
        this.logs[scope].text
    }
  }

  private tempAppend(
    newLogText?: string,
    newProgressBarSpecs?: any,
    scope=UNINDEXED
  ) {
    if (!this.logs[scope]) {
      this.logs[scope] = {}
      this.setTimestamp(scope)
    }
    if (newProgressBarSpecs) {
      this.setProgress(scope, newProgressBarSpecs)
    }
    if (!isEmpty(path([scope, 'progress'], this.logs))) {
      this.logs[scope].tempText = newLogText ? `${INDENTATION}${newLogText}\n` : ''
    } else {
      this.logs[scope].tempText = newLogText ? `${newLogText}\n` : ''
    }
  }

  private render(scope: string): string {
    let logInfo
    logInfo = this.logs[scope]
    let renderedLog: string = ''
    if (!isEmpty(logInfo)) {
      let formattedProgressLine
      if (!isEmpty(logInfo.progress)) {
        const terminalWidth = process.stdout.columns
        const progressBarPadding = terminalWidth - logInfo.progress.text.length - 1
        formattedProgressLine = chalk.bold(
          sprintf(
            `%s %${progressBarPadding}s`,
            logInfo.progress.text,
            logInfo.progress.value
          ) + '\n'
        )
        renderedLog = `${renderedLog}${formattedProgressLine}`
      }
      if (logInfo.text) {
        renderedLog = `${renderedLog}${logInfo.text}`
      }
      if (logInfo.tempText) {
        renderedLog = `${renderedLog}${logInfo.tempText}`
      }
      if (renderedLog !== '') {
      return renderedLog
      }
    }
  }

  private renderAll() {
    const sortedKeys = sort((a,b) => (this.logs[a].timestamp-this.logs[b].timestamp), keys(this.logs))
    const result = sortedKeys.map((x) => this.render(x))
    const filteredResult = filter(x => !!x, result)
    this.renderedLogs = filteredResult.join('\n')
    singleLineLog(this.renderedLogs)
  }

  private setProgress(scope, newProgressBarSpecs) {
    if (!this.logs[scope].progress) {
      this.logs[scope].progress = {}
    }
    const { text, value } = newProgressBarSpecs
    if (text !== undefined) {
      this.logs[scope].progress.text = text
    }
    if (value !== undefined) {
      this.logs[scope].progress.value = value
    }
  }

  private setTimestamp(scope) {
    if (!this.logs[scope]) {
      this.logs[scope] = {}
    }
    this.logs[scope].timestamp = Date.now()
  }

}

export class ColossusTransport extends Transport {
  constructor(opts) {
    super(opts)
  }

  public log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })
    switch (info.level){
    case 'debug':
        colossusLogger.debug(info, pkgId)
    case 'info':
        colossusLogger.info(info, pkgId)
    case 'warn':
        colossusLogger.warn(info, pkgId)
    case 'error':
        colossusLogger.error(info, pkgId)
    }
    callback()
  }
}

const consoleFormatter = format((info, _) => {
  // Formatter for console logs.
  const { level } = info
  if (level === 'error') {
    info.message = chalk.red(info.message)
  }
  return info
})

const messageFormatter = format((info, _) => {
  // Write all relevant information in info.message
  const { timestamp: timeString='', sender='', message } = info
  info.message = `${chalk.gray(timeString)} - ${info.level}:  ${message} ${chalk.gray(sender)}`
  return info
})

const filterMessage = format((info, _) => {
  if (!info.message) { return false }
  return info
})

interface ExtendedLogger extends Logger {
  scopedProgress?(value: number, text?: string, scope?: string): void
  scopedDebug?(message: string, scope?: string, append?: boolean): void
  scopedInfo?(message: string, scope?: string, append?: boolean): void
  scopedWarn?(message: string, scope?: string, append?: boolean): void
  scopedError?(message: string, scope?: string, append?: boolean): void
  clearScope?(scope: string): void
  clearAll?(): void
}

const consoleTransport = useFancyLogger ?
  new FancyConsoleTransport({
    format: consoleFormatter(),
    level: 'info',
  }) :
  new SimpleConsoleTransport({
    format: combine(
      filterMessage(),
      timestamp({ format: 'HH:mm:ss.SSS' }),
      colorize(),
      messageFormatter()
    ),
    level: isVerbose ? 'debug' : 'info',
  })

const logger = createLogger({
  transports: [
    consoleTransport,
    new transports.File({
      filename: DEBUG_LOG_FILE_PATH,
      format: combine(
        timestamp({ format: 'hh:mm:ss.SSS' }),
        messageFormatter()
      ),
      level: 'debug',
      maxsize: 10E6,
      maxFiles: 1,
    }),
    new ColossusTransport({
      level: 'error',
    }),
  ],
}) as ExtendedLogger


logger.clearScope = (scope?: string) => logger.log({message: undefined, level: 'info', clear: true, scope})
logger.clearAll = () => logger.log({message: undefined, clearAll: true, level: 'info'})
logger.scopedProgress = (value: number, text?: string, scope?: string) => {
logger.log({message: '', level: 'info', progress: {text, value}, scope})
}
logger.scopedDebug = (message: string, scope: string, append=false) => {
logger.log({message, scope, append, level: 'debug'})
}
logger.scopedInfo = (message: string, scope: string, append=false) => {
logger.log({message, scope, append, level: 'info'})
}
logger.scopedWarn = (message: string, scope: string, append=false) => {
logger.log({message, scope, append, level: 'warning'})
}
logger.scopedError = (message: string, scope: string, append=false) => {
logger.log({message, scope, append, level: 'error'})
}

logger.on('error', (err) => {
  console.error('A problem occured with the logger:')
  console.error(err)
})

logger.on('finish', (info) => {
  console.log(`Logging has finished: ${info}`)
})
export default logger
