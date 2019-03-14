import * as progress from 'progress-string'
import { stdout as singleLineLog } from 'single-line-log'
import { createLogger, format, transports } from 'winston'
import  * as Transport from 'winston-transport'

const { combine, timestamp, simple, json, colorize } = format
const bar = progress({
  width: 40,
  total: 100,
  style: (complete, incomplete) => {
    return '#'.repeat(complete.length) + '' + ' '.repeat(incomplete.length)
  },
})

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
    const { message, clear=false, append=true, progressBarSpecs } = info
    const newLogText = message || ''
    let newProgressBarText = ''
    let newProgressBar = ''
    if (progressBarSpecs) {
      const { text, value } = progressBarSpecs
      newProgressBarText = text || ''
      newProgressBar = value ? `  [${bar(value)}]\n` : ''
    }
    if (clear) {
      console.log()
      this.progressBarText = newProgressBarText
      this.progressBar = newProgressBar
      this.logText = newLogText
    } else if (append) {
      this.progressBarText = newProgressBarText || this.progressBarText
      this.progressBar = newProgressBar || this.progressBar
      this.logText = `${this.logText}${newLogText}\n`
    } else {
      this.progressBarText = newProgressBarText || this.progressBarText
      this.progressBar = newProgressBar || this.progressBar
      this.logText = `${newLogText}\n`
    }
    singleLineLog(
      `${this.progressBarText}${this.progressBar}${this.logText}`
    )
    callback()
  }
}

class ColossusTransport extends Transport {
  constructor(opts) {
    super(opts)
  }

  public log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })
    callback()

  }
}

const consoleFormatter = format((info, _) => {
  // Formatter for console logs.
  return info
})

const logger = createLogger({
  transports: [
    new ConsoleTransport({
      format: combine(
        timestamp({format: 'hh:mm:ss.SSS'}),
        simple(),
        colorize({colors: {info: 'blue'}}),
        consoleFormatter()
      ),
      level: 'info',
    }),
    new transports.File({
      filename: 'debug.txt',
      level: 'error',
    }),
    new ColossusTransport({
      format: combine(
        timestamp(),
        json()
      ),
      level: 'error',
    }),
  ],
})

logger.on('error', (err) => {
  console.error('A problem occured with the logger:')
  console.error(err)
})

logger.on('finish', (info) => {
  console.log(`Logging has finished: ${info}`)
})

export default logger
