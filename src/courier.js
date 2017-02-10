import chalk from 'chalk'
import log from './logger'
import moment from 'moment'
import {timeStop} from './time'
import endpoint from './endpoint'
import stripAnsi from 'strip-ansi'
import {manifest} from './manifest'
import {clearAbove} from './terminal'
import EventSource from 'eventsource'
import {consumeChangeLog} from './apps'
import {locatorByMajor} from './locator'
import {__, any, contains, map} from 'ramda'
import {setSpinnerText, stopSpinner, isSpinnerActive} from './spinner'

const courierHost = endpoint('courier')
const colossusHost = endpoint('colossus')

const levelFormat = {
  debug: log.debug,
  info: log.info,
  warning: log.warn,
  error: log.error,
}

let timeoutId

const stopAndLog = (log) => {
  const timeEnd = timeStop()
  const isValidLog = log && log.length > 0
  const isStopped = stopSpinner()

  if (!isValidLog || !timeEnd) {
    return
  }

  if (!isStopped) {
    clearAbove()
  }

  const logLength = stripAnsi(log).split('\n').pop().length
  const padLength = process.stdout.columns - (logLength + timeEnd.length)
  const pad = padLength > 0 ? Array(padLength).join(' ') : ' '
  const timedLog = `${log}${pad}${chalk.gray(timeEnd)}`
  console.log(timedLog)
}

const logToConsole = (level, origin, message, timeout, action) => {
  const isLogLevelInfo = log.level === 'info'
  const {message: text, timeout: msgTimeout} = typeof message === 'string'
    ? {message} : message
  if (isSpinnerActive()) {
    clearAbove()
    if (isLogLevelInfo) {
      if (level === 'error') {
        stopAndLog(consumeChangeLog())
        clearAbove()
        return console.log(`\n${text}\n`)
      }

      if (timeout && action) {
        timeoutId = setTimeout(action, msgTimeout || timeout)
      }

      setSpinnerText(text, msgTimeout || timeout)
      return
    }
  }

  const format = isLogLevelInfo ? 'HH:mm:ss' : 'HH:mm:ss:SSS'
  const time = moment().format(format)
  levelFormat[level](`[${time}] ${text}`)
}

const getOriginByManifest = () => {
  const {name, vendor, version} = manifest
  return `${vendor}.${name}@${version}`
}

const originMatch = (msgOrigin, origin = []) => {
  if (origin.length === 0) {
    origin.push(getOriginByManifest())
  }
  return any(contains(__, locatorByMajor(msgOrigin)), map(locatorByMajor, origin))
}

const listen = (account, workspace, authToken, {timeout: {duration, action}, origin, callback} = {timeout: {}}) => {
  const hasTimeout = duration && action
  const es = new EventSource(`${courierHost}/${account}/${workspace}/app-events?level=${log.level}`, {
    'Authorization': `token ${authToken}`,
  })

  es.onopen = () => {
    log.debug(`courier: connected with level ${log.level}`)
    timeoutId = hasTimeout ? setTimeout(action, duration) : null
  }

  es.addEventListener('system', (msg) => {
    clearTimeout(timeoutId)
    const {message, origin: msgOrigin} = JSON.parse(msg.data)
    if (!originMatch(msgOrigin, origin)) {
      return
    }

    if (message === 'workspace:changed') {
      stopAndLog(consumeChangeLog())
      if (callback) {
        callback()
      }
    }

    timeoutId = hasTimeout ? setTimeout(action, duration) : null
  })

  es.addEventListener('message', (msg) => {
    clearTimeout(timeoutId)
    const {level, origin: msgOrigin, message} = JSON.parse(msg.data)
    if (!originMatch(msgOrigin, origin)) {
      return
    }

    logToConsole(level, origin, message, duration, action)
  })

  es.onerror = (err) => {
    clearTimeout(timeoutId)
    log.error(`Connection to courier server has failed with status ${err.status}`)
    timeoutId = hasTimeout ? setTimeout(action, duration) : null
  }
}

const consumeAppLogs = (account: string, workspace: string, level: string) => {
  const es = new EventSource(`${colossusHost}/${account}/${workspace}/logs?level=${level}`)
  es.onopen = () => {
    log.debug(`Connected to logs with level ${level} ${chalk.blue('[io]')}`)
  }

  es.addEventListener('message', (msg) => {
    const {body: {message}, level} = JSON.parse(msg.data)
    const color = level === 'error' ? chalk.red : chalk.blue
    log.debug(`${message.trim()} ${color('[io]')}`)
  })

  es.onerror = (err) => {
    log.error(`Connection to log server has failed with status ${err.status} ${chalk.red('[io]')}`)
  }
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: listen,
  log: consumeAppLogs,
}
