import EventSource from 'eventsource'
import chalk from 'chalk'
import moment from 'moment'

const levelFormat = {
  debug: chalk.bgBlue('DEBUG'),
  info: chalk.blue('INFO'),
  warning: chalk.bgYellow('WARN'),
  error: chalk.bgRed('ERROR'),
}

const format = (fullMessage) => {
  let level = levelFormat[fullMessage.level]
  let time = moment().format('hh:mm:ss')
  return `[${time}] ${level}: ${fullMessage.message}`
}

export default {
  logLevels: Object.keys(levelFormat),
  listen: (account, workspace, level, authToken) => {
    level = level || 'info'

    console.log('starting listener with level ' + level)
    let es = new EventSource(`http://courier.vtex.com/${account}/${workspace}/app-events?level=${level}`, {
      'Authorization': `token ${authToken}`,
    })
    es.addEventListener('connect', () => console.log('Listening to events...'))
    es.addEventListener('message', (message) => {
      let fullMessage = JSON.parse(message.data)
      console.log(format(fullMessage))
    })

    es.onerror = (err) => console.log(`${chalk.bgRed('ERROR:')} failed to connect to Courier server with status ${err.status}`)
  },
}
