import chalk from 'chalk'
import log from './logger'
import endpoint from './endpoint'
import {manifest} from './manifest'
import EventSource from 'eventsource'
import {} from './conf'

const colossusHost = endpoint('colossus')

const levelAdapter = {
  warning: 'warn',
}

export const listen = (account, workspace, level, id) => {
  const es = new EventSource(`${colossusHost}/${account}/${workspace}/logs?level=${level}`)
  es.onopen = () => {
    log.debug(`Connected to logs with level ${level}`)
  }

  es.addEventListener('message', (msg) => {
    const {body: {message, code}, level, subject, sender} = JSON.parse(msg.data)
    if (subject.startsWith(`${manifest.vendor}.${manifest.name}`) || subject.startsWith('-')) {
      const suffix = id === sender ? '' : ' ' + chalk.gray(sender)
      log.log(levelAdapter[level] || level, `${(message || code || '').replace(/\n\s*$/, '')}${suffix}`)
    }
  })

  es.onerror = (err) => {
    log.error(`Connection to log server has failed with status ${err.status}`)
  }
}
