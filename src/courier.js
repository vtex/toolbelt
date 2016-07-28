import EventSource from 'eventsource'
import log from './logger'

const levelFormat = {
  debug: log.debug,
  info: log.info,
  warning: log.warn,
  error: log.error,
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: (account, workspace, level, authToken) => {
    level = level || 'info'

    let es = new EventSource(`http://courier.vtex.com/${account}/${workspace}/app-events?level=${level}`, {
      'Authorization': `token ${authToken}`,
    })
    es.onopen = () => log.info(`Listening for events with level ${level}`)
    es.addEventListener('message', (message) => {
      let data = JSON.parse(message.data)
      levelFormat[data.level](`(${data.origin}) ${data.message}`)
    })
    es.onerror = (err) => log.error(`Failed to connect to Courier server with status ${err.status}`)
  },
}
