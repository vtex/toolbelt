import chalk from 'chalk'
import { join } from 'path'
import { createLogger, format, transports } from 'winston'
import * as Transport from 'winston-transport'
import { configDir } from './conf'

// Setup logging
const VERBOSE = '--verbose'
const isVerbose = process.argv.indexOf(VERBOSE) >= 0

const { combine, timestamp, colorize } = format

// The debug file is likely to be on ~/.config/configstore/vtex_debug.txt
export const DEBUG_LOG_FILE_PATH = join(configDir, 'vtex_debug.txt')

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

const messageFormatter = format((info, _) => {
  // Write all relevant information in info.message
  const { timestamp: timeString = '', sender = '', message } = info
  info.message = `${chalk.gray(timeString)} - ${info.level}:  ${message} ${chalk.gray(sender)}`
  return info
})

const filterMessage = format((info, _) => {
  if (!info.message) {
    return false
  }
  return info
})

const consoleTransport = new SimpleConsoleTransport({
  format: combine(filterMessage(), timestamp({ format: 'HH:mm:ss.SSS' }), colorize(), messageFormatter()),
  level: isVerbose ? 'debug' : 'info',
})

const logger = createLogger({
  transports: [
    consoleTransport,
    new transports.File({
      filename: DEBUG_LOG_FILE_PATH,
      format: combine(timestamp({ format: 'hh:mm:ss.SSS' }), format.json()),
      level: 'debug',
      maxsize: 10e6,
      maxFiles: 1,
    }),
  ],
})

logger.on('error', err => {
  console.error('A problem occured with the logger:')
  console.error(err)
})

logger.on('finish', info => {
  console.log(`Logging has finished: ${info}`)
})

export default logger
