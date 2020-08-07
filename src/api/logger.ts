import chalk from 'chalk'
import { join } from 'path'
import util from 'util'
import { createLogger, format, transports } from 'winston'
import { PathConstants } from '../lib/constants/Paths'
import { isVerbose } from './verbose'

// The debug file is likely to be on ~/.config/configstore/vtex_debug.txt
export const DEBUG_LOG_FILE_PATH = join(PathConstants.LOGS_FOLDER, 'debug.json')

const isObject = (a: any) => {
  return !!a && a.constructor === Object
}

const addArgs = format(info => {
  // @ts-ignore
  const args: any[] = info[Symbol.for('splat')]
  info.args = args ? [...args] : []
  return info
})

const messageFormatter = format.printf(info => {
  const { timestamp: timeString = '', sender = '', message, args = [] } = info
  const formattedMsgWithArgs = util.formatWithOptions({ colors: true }, message, ...args)
  const msg = `${chalk.gray(timeString)} - ${info.level}: ${formattedMsgWithArgs}  ${chalk.gray(sender)}`
  return msg
})

// JSON.stringify doesn't get non-enumerable properties
// This is a workaround based on https://stackoverflow.com/a/18391400/11452359
const errorJsonReplacer = (key: any, value: any) => {
  if (key === '' && isObject(value) && value.args != null) {
    value.args = value.args.map((arg: any) => {
      if (arg instanceof Error) {
        const error = {}
        Object.getOwnPropertyNames(arg).forEach(objKey => {
          error[objKey] = arg[objKey]
        })
        return error
      }

      return arg
    })
  }

  return value
}

export const consoleLoggerLevel = () => {
  return isVerbose ? 'debug' : 'info'
}

export const fileLoggerLevel = () => {
  return 'debug'
}

const logger = createLogger({
  format: format.combine(addArgs(), format.timestamp({ format: 'HH:mm:ss.SSS' })),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), messageFormatter),
      level: consoleLoggerLevel(),
    }),
    new transports.File({
      filename: DEBUG_LOG_FILE_PATH,
      format: format.combine(format.json({ replacer: errorJsonReplacer, space: 2 })),
      level: fileLoggerLevel(),
      maxsize: 5e6,
      maxFiles: 2,
    }),
  ],
})

const levels = ['debug', 'info', 'error', 'warn', 'verbose', 'silly']
levels.forEach(level => {
  logger[level] = (msg: any, ...remains: any[]) => {
    if (remains.length > 0 && isObject(remains[0]) && remains[0].message) {
      msg = `${msg} `
    }

    if (typeof msg !== 'string') {
      return logger.log(level, '', msg, ...remains)
    }

    logger.log(level, msg, ...remains)
  }
})

logger.on('error', err => {
  console.error('A problem occured with the logger:')
  console.error(err)
})

logger.on('finish', info => {
  console.log(`Logging has finished: ${info}`)
})

export default logger
