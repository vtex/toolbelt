import * as chalk from 'chalk'
import * as EventSource from 'eventsource'
import {compose, forEach} from 'ramda'

import log from './logger'
import {endpoint} from './env'
import {getToken} from './conf'
import userAgent from './user-agent'
import {SSEConnectionError} from './errors'

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

const parseKeyToQueryParameter = (keys: string[]): string => {
  let urlQueryParameters = ''
  forEach(key => {
    urlQueryParameters += `&keys=${key}`
  }, keys)
  return urlQueryParameters
}

export const withId = (id: string, router: boolean, callback: Function) => (msg: Message) => {
  if ((id && msg.subject.startsWith(id)) || (router && msg.subject.startsWith('-'))) {
    callback(msg)
  }
}

export const onLog = (ctx: Context, logLevel: string, callback: (message: Message) => void): any => {
  const source = `${colossusHost}/${ctx.account}/${ctx.workspace}/logs?level=${logLevel}`
  const es = createEventSource(source)
  es.onopen = onOpen(`${logLevel} log`)
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError(`${logLevel} log`)
  return es.close.bind(es)
}

export const onEvent = (ctx: Context, sender: string, keys: string[], callback: (message: Message) => void): Function => {
  const source = `${colossusHost}/${ctx.account}/${ctx.workspace}/events?sender=${sender}&subject=-${parseKeyToQueryParameter(keys)}`
  const es = createEventSource(source)
  es.onopen = onOpen('event')
  es.onmessage = compose(callback, parseMessage)
  es.onerror = onError('event')
  return es.close.bind(es)
}

export const logAll = (context: Context, logLevel, id) => {
  let previous = ''
  return onLog(context, logLevel, withId(id, true, ({sender, level, body: {message, code}}: Message) => {
    if (!(message || code)) {
      return // Ignore logs without message or code.
    }
    const suffix = sender.startsWith(id) ? '' : ' ' + chalk.gray(sender)
    const formatted = (message || code || '').replace(/\n\s*$/, '') + suffix
    if (previous !== formatted) {
      previous = formatted
      log.log(level, formatted)
    }
  }))
}

export const onAuth = (account: string, workspace: string, state: string): Promise<string> => {
  const source = `https://${workspace}--${account}.myvtex.com/_v/auth-server/v1/sse/${state}`
  const es = createEventSource(source)
  return new Promise((resolve, reject) => {
    es.onmessage = (msg: MessageJSON) => {
      const {body: token} = JSON.parse(msg.data) as {body: string}
      es.close()
      resolve(token)
    }

    es.onerror = (event) => {
      es.close()
      reject(new SSEConnectionError(`Connection to login server has failed with status ${event.status}`, event.status))
    }
  })
}
