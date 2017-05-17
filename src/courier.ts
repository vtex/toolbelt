import * as chalk from 'chalk'
import * as EventSource from 'eventsource'
import {compose} from 'ramda'

import log from './logger'
import endpoint from './endpoint'
import {getAccount, getWorkspace} from './conf'

const levelAdapter = {warning: 'warn'}
const colossusHost = endpoint('colossus')

const onOpen = type => () =>
  log.debug(`Connected to ${type} server`)

const onError = type => (err) =>
  log.error(`Connection to ${type} server has failed with status ${err.status}`)

const parseMessage = (msg: MessageJSON): Message => {
  const {
    sender,
    subject,
    level,
    body: {message, code},
  }: Message = JSON.parse(msg.data)
  return {
    sender,
    subject,
    level: levelAdapter[level] || level,
    body: {message, code},
  }
}

export const withId = (id: string, router: boolean, callback: Function) => (msg: Message) => {
  if ((id && msg.subject.startsWith(id)) || (router && msg.subject.startsWith('-'))) {
    callback(msg)
  }
}

export const onLog = (logLevel: string, callback: (message: Message) => void): Function => {
  const source = `${colossusHost}/${getAccount()}/${getWorkspace()}/logs?level=${logLevel}`
  const es = new EventSource(source)
  es.onopen = onOpen(`${logLevel} log`)
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError(`${logLevel} log`)
  return es.close.bind(es)
}

export const onEvent = (sender: string, key: string, callback: (message: Message) => void): Function => {
  const source = `${colossusHost}/${getAccount()}/${getWorkspace()}/events/${sender}:-:${key}`
  const es = new EventSource(source)
  es.onopen = onOpen('event')
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError('event')
  return es.close.bind(es)
}

export const logAll = (logLevel, id) => {
  let previous = ''
  return onLog(logLevel, withId(id, true, ({sender, level, body: {message, code}}: Message) => {
    const suffix = sender.startsWith(id) ? '' : ' ' + chalk.gray(sender)
    const formatted = (message || code || '').replace(/\n\s*$/, '') + suffix
    if (previous !== formatted) {
      previous = formatted
      log.log(level, formatted)
    }
  }))
}
