import * as chalk from 'chalk'
import * as EventSource from 'eventsource'

import log from './logger'
import endpoint from './endpoint'
import {manifest} from './manifest'

let prevMsg = ''
const levelAdapter = {warning: 'warn'}
const colossusHost = endpoint('colossus')

export const listen = (account: string, workspace: string, level: string, id: string): void => {
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
    if (subject.startsWith(`${manifest.vendor}.${manifest.name}`) || subject.startsWith('-')) {
      const logLevel = levelAdapter[msgLevel] || msgLevel
      const suffix = id === sender ? '' : ' ' + chalk.gray(sender)
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
}
