import chalk from 'chalk'
import log from './logger'
import moment from 'moment'
import {timeStop} from './time'
import stripAnsi from 'strip-ansi'
import {manifest} from './manifest'
import EventSource from 'eventsource'
import {consumeChangeLog} from './apps'
import {clearLine, cursorTo} from 'readline'
import {setSpinnerText, stopSpinner, isSpinnerActive} from './spinner'

const levelFormat = {
  debug: log.debug,
  info: log.info,
  warning: log.warn,
  error: log.error,
}

const maxRetries = 30
let retryCount = 0
const getInterval = () => 2000 * Math.pow(1.15, retryCount)

let retry = (account, workspace, authToken) => {
  let interval = getInterval()
  if (++retryCount <= maxRetries) {
    setTimeout(() => listen(account, workspace, authToken), interval)
    log.debug(`courier: will retry in ${Math.round(interval / 100) / 10} seconds`)
  }
}

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

const logToConsole = (level, origin, message) => {
  const isLogLevelInfo = log.level === 'info'
  const {message: text, timeout} = typeof message === 'string'
    ? {message} : message
  if (isLogLevelInfo && isSpinnerActive()) {
    if (level === 'error') {
      stopAndLog(consumeChangeLog())
      clearAbove()
      return console.log(`\n${text}\n`)
    }
    setSpinnerText(text, timeout)
    return
  }

  const format = isLogLevelInfo ? 'HH:mm:ss' : 'HH:mm:ss:SSS'
  const time = moment().format(format)
  levelFormat[level](`[${time}] ${text}`)
}

const originMatch = (origin) => {
  const {vendor, name, version} = manifest
  const local = `${vendor}.${name}@${version.substring(0, 0)}`
  return local === origin.substring(0, origin.indexOf('@') + 1)
}

const listen = (account, workspace, authToken) => {
  let es = new EventSource(`http://courier.vtex.com/${account}/${workspace}/app-events?level=${log.level}`, {
    'Authorization': `token ${authToken}`,
  })
  es.onopen = () => log.debug(`courier: connected with level ${log.level}`)
  es.addEventListener('system', async (msg) => {
    let {message, origin} = JSON.parse(msg.data)
    if (!originMatch(origin)) {
      return
    }

    if (message === 'workspace:changed') {
      stopAndLog(consumeChangeLog())
    }
  })
  es.addEventListener('message', (msg) => {
    let {level, origin, message} = JSON.parse(msg.data)
    if (!originMatch(origin)) {
      return
    }

    clearAbove()
    logToConsole(level, origin, message)
    retryCount = 0
  })
  es.addEventListener('close', (msg) => {
    log.debug(`courier: connection closed. Error: ${msg.data}`)
    es.close()
    retry(account, workspace, authToken)
  })
  es.onerror = (err) => {
    log.debug(`courier: failed to connect with status ${err.status}`)
    retry(account, workspace, authToken)
  }
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: listen,
}
