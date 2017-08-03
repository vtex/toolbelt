import * as chalk from 'chalk'
import * as EventSource from 'eventsource'
import {compose} from 'ramda'

import log from './logger'
import endpoint from './endpoint'
import {getToken} from './conf'
import userAgent from './user-agent'

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

const createEventSource = (source: string) =>
  new EventSource(source, {
    headers: {
      authorization: `bearer ${getToken()}`,
      'user-agent': userAgent,
    },
  })

export const withId = (id: string, router: boolean, callback: Function) => (msg: Message) => {
  if ((id && msg.subject.startsWith(id)) || (router && msg.subject.startsWith('-'))) {
    callback(msg)
  }
}

export const onLog = (ctx: Context, logLevel: string, callback: (message: Message) => void): Function => {
  const source = `${colossusHost}/${ctx.account}/${ctx.workspace}/logs?level=${logLevel}`
  const es = createEventSource(source)
  es.onopen = onOpen(`${logLevel} log`)
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError(`${logLevel} log`)
  return es.close.bind(es)
}

export const onEvent = (ctx: Context, sender: string, key: string, callback: (message: Message) => void): Function => {
  const source = `${colossusHost}/${ctx.account}/${ctx.workspace}/events/${sender}:-:${key}`
  const es = createEventSource(source)
  es.onopen = onOpen('event')
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError('event')
  return es.close.bind(es)
}

export const logAll = (context: Context, logLevel, id) => {
  let previous = ''
  return onLog(context, logLevel, withId(id, true, ({sender, level, body: {message, code}}: Message) => {
    const suffix = sender.startsWith(id) ? '' : ' ' + chalk.gray(sender)
    const formatted = (message || code || '').replace(/\n\s*$/, '') + suffix
    if (previous !== formatted) {
      previous = formatted
      log.log(level, formatted)
    }
  }))
}

export const onAuth = (account: string, workspace: string, state: string): Promise<string> => {
  const source = `https://${account}.myvtex.com/_toolbelt/sse/${state}?workspace=${workspace}`
  const es = createEventSource(source)
  return new Promise((resolve, reject) => {
    es.addEventListener('message', (msg: MessageJSON) => {
      const {body: token} = JSON.parse(msg.data) as {body: string}
      es.close()
      resolve(token)
    })

    es.onerror = (err) => {
      log.error(`Connection to login server has failed with status ${err.status}`)
      reject(err)
    }
  })
}
