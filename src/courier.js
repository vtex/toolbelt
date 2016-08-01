import EventSource from 'eventsource'
import log from './logger'

const levelFormat = {
  debug: log.debug,
  info: log.info,
  warning: log.warn,
  error: log.error,
}

const maxRetries = 30
let retryCount = 0
const getInterval = () => 2000 * Math.pow(1.15, retryCount)

let retry = (account, workspace, level, authToken) => {
  let interval = getInterval()
  if (++retryCount <= maxRetries) {
    setTimeout(() => listen(account, workspace, level, authToken), interval)
    log.debug(`courier: will retry in ${Math.round(interval / 100) / 10} seconds`)
  }
}

const listen = (account, workspace, level, authToken) => {
  level = level || 'info'

  let es = new EventSource(`http://courier.vtex.com/${account}/${workspace}/app-events?level=${level}`, {
    'Authorization': `token ${authToken}`,
  })
  es.onopen = () => log.debug(`courier: connected with level ${level}`)
  es.addEventListener('message', (message) => {
    let data = JSON.parse(message.data)
    levelFormat[data.level](`(${data.origin}) ${data.message}`)
    retryCount = 0
  })
  es.addEventListener('close', (message) => {
    log.debug(`courrier: connection closed. Error: ${message.data}`)
    es.close()
    retry(account, workspace, level, authToken)
  })
  es.onerror = (err) => {
    log.debug(`courier: failed to connect with status ${err.status}`)
    retry(account, workspace, level, authToken)
  }
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: listen,
}
