import * as chalk from 'chalk'
import * as EventSource from 'eventsource'

import log from './logger'
import endpoint from './endpoint'

let prevMsg = ''
const levelAdapter = {warning: 'warn'}
const colossusHost = endpoint('colossus')

export const listen = (account: string, workspace: string, level: string, id: string): SSEHandler => {
  const es = new EventSource(`${colossusHost}/${account}/${workspace}/logs?level=${level}`)
  es.onopen = () =>
    log.debug(`Connected to logs with level ${level}`)

  es.addEventListener('message', (msg: MessageJSON) => {
    const {
      sender,
      subject,
      level: msgLevel,
      body: {message, code},
    }: Message = JSON.parse(msg.data)
    if (subject.startsWith(id) || subject.startsWith('-')) {
      const logLevel = levelAdapter[msgLevel] || msgLevel
      const suffix = sender.startsWith(id) ? '' : ' ' + chalk.gray(sender)
      const formattedMsg = (message || code || '').replace(/\n\s*$/, '')
      if (prevMsg === formattedMsg) {
        return
      }
      prevMsg = formattedMsg
      log.log(logLevel, `${formattedMsg}${suffix}`)
    }
  })

  es.onerror = (err) =>
    log.error(`Connection to log server has failed with status ${err.status}`)

  return {
    close: () => {
      es.close()
    },
  }
}

export const onEvent = (account: string, workspace: string, sender: string, key: string, callback: (message: string) => void): SSEHandler => {
  const es = new EventSource(`${colossusHost}/${account}/${workspace}/events/${sender}:-:${key}`)

  es.addEventListener('message', (msg: MessageJSON) => {
    const {body: {message}}: Message = JSON.parse(msg.data)
    callback(message)
  })

  es.onerror = (err) =>
    log.error(`Connection to log server has failed with status ${err.status}`)

  return {
    close: () => {
      es.close()
    },
  }
}
