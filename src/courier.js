import chalk from 'chalk'
import log from './logger'
import moment from 'moment'
import {timeStop} from './time'
import endpoint from './endpoint'
import stripAnsi from 'strip-ansi'
import {manifest} from './manifest'
import EventSource from 'eventsource'
import {consumeChangeLog} from './apps'
import {clearLine, cursorTo} from 'readline'
import {locatorByMajor} from './locator'
import {__, any, contains, map} from 'ramda'
import {setSpinnerText, stopSpinner, isSpinnerActive} from './spinner'

const courierHost = endpoint('courier')

const levelFormat = {
  debug: log.debug,
  info: log.info,
  warning: log.warn,
  error: log.error,
}

let timeoutId

const clearAbove = () => {
  clearLine(process.stdout, 0)
  cursorTo(process.stdout, 0)
}

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
  if (isLogLevelInfo && isSpinnerActive()) {
    if (level === 'error') {
      stopAndLog(consumeChangeLog())
      clearAbove()
      return console.log(`\n${text}\n`)
    }

    if (timeout) {
      timeoutId = setTimeout(action, msgTimeout || timeout)
    }

    setSpinnerText(text, msgTimeout || timeout)
    return
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

const listen = (account, workspace, authToken, {timeout: {duration, action}, origin, callback}) => {
  const es = new EventSource(`${courierHost}/${account}/${workspace}/app-events?level=${log.level}`, {
    'Authorization': `token ${authToken}`,
  })

  es.onopen = () => {
    log.debug(`courier: connected with level ${log.level}`)
    timeoutId = setTimeout(action, duration)
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

    timeoutId = setTimeout(action, duration)
  })

  es.addEventListener('message', (msg) => {
    clearTimeout(timeoutId)
    const {level, origin: msgOrigin, message} = JSON.parse(msg.data)
    if (!originMatch(msgOrigin, origin)) {
      return
    }

    clearAbove()
    logToConsole(level, origin, message, duration, action)
  })

  es.onerror = (err) => {
    clearTimeout(timeoutId)
    log.error(`Connection to courier server has failed with status ${err.status}`)
    timeoutId = setTimeout(action, duration)
  }
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: listen,
}
