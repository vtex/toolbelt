import * as path from 'path'
import * as progress from 'progress-string'
import { stdout as singleLineLog } from 'single-line-log'
import { createLogger, format, Logger, transports } from 'winston'
import  * as Transport from 'winston-transport'
import { name as pkgName, version as pkgVersion } from '../package.json'
import { logger as colossusLogger } from './clients'
import { configDir } from './conf'

const { combine, timestamp, colorize } = format
const bar = progress({
  width: 40,
  total: 100,
  style: (complete, incomplete) => {
    return '#'.repeat(complete.length) + '' + ' '.repeat(incomplete.length)
  },
})

export const debugLogFilePath = path.join(configDir, 'debug.txt')
const pkgId = `${pkgName}@${pkgVersion}`

class ConsoleTransport extends Transport {
  private progressBarText: any
  private progressBar: any
  private logText: string

  constructor(opts) {
    super(opts)
    this.progressBarText = ''
    this.progressBar = ''
    this.logText = ''
  }

  public log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })
    const {
      message,
      clear=false,
      append=true,
      progress: progressBarSpecs,
    } = info
    const newLogText = message || ''
    let newProgressBarText = ''
    let newProgressBar = ''
    if (progressBarSpecs) {
      const { text, value } = progressBarSpecs
      newProgressBarText = text || ''
      newProgressBar = value ? `  [${bar(value)}]\n` : ''
    }
    if (true) {
    if (clear) {
      console.log()
      this.progressBarText = newProgressBarText
      this.progressBar = newProgressBar
      this.logText = newLogText
    } else if (append) {
      this.progressBarText = newProgressBarText || this.progressBarText
      this.progressBar = newProgressBar || this.progressBar
      this.logText = newLogText ? `${this.logText}${newLogText}\n` : this.logText
    } else {
      this.progressBarText = newProgressBarText || this.progressBarText
      this.progressBar = newProgressBar || this.progressBar
      this.logText = newLogText ? `${newLogText}\n` : ''
    }
    singleLineLog(`${this.progressBarText}${this.progressBar}${this.logText}`)
    }
    callback()
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
        colossusLogger.error(info, {}, pkgId)
    }
    callback()
  }
}

const consoleFormatter = format((info, _) => {
  // Formatter for console logs.
  return info
})

const fileFormatter = format((info, _) => {
  // Formatter for file logs
  const { timestamp: timeString='', sender='', message } = info
  info.message = `${timeString} - ${sender} ${info.level}:  ${message}`
  return info
})

interface ExtendedLogger extends Logger {
  progress?(progressSpecs: any): void
  newInfoSection?(): void
}

const logger = createLogger({
  transports: [
    new ConsoleTransport({
      format: combine(
        colorize({ all: true, colors: { debug: 'blue' }}),
        consoleFormatter()
      ),
      level: 'info',
    }),
    new transports.File({
      filename: debugLogFilePath,
      format: combine(
        timestamp({ format: 'hh:mm:ss.SSS' }),
        fileFormatter()
      ),
      level: 'debug',
    }),
    new ColossusTransport({
      level: 'error',
    }),
  ],
}) as ExtendedLogger


logger.clear = () => logger.log({message: '', level: 'info', clear: true})
logger.progress = (progressSpecs: {text?: string, value?: number}) => {
  logger.log({message: '', level: 'info', progress: progressSpecs})
}

logger.on('error', (err) => {
  console.error('A problem occured with the logger:')
  console.error(err)
})

logger.on('finish', (info) => {
  console.log(`Logging has finished: ${info}`)
})

export default logger
