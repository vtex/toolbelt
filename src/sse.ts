import { compose, contains, forEach, path, pathOr } from 'ramda'

import { getToken } from './conf'
import { endpoint, envCookies, publicEndpoint } from './env'
import { SSEConnectionError } from './errors'
import EventSource from './eventsource'
import { removeVersion } from './locator'
import log from './logger'
import userAgent from './user-agent'

const levelAdapter = { warning: 'warn' }

const onOpen = type => () =>
  log.debug(`Connected to ${type} server`)

const onError = type => (err) =>
  log.error(`Connection to ${type} server has failed with status ${err.status}`)

const parseMessage = (msg: MessageJSON): Message => {
  const {
    sender,
    subject,
    level,
    body,
  }: Message = JSON.parse(msg.data)
  return {
    body,
    level: levelAdapter[level] || level,
    sender,
    subject,
  }
}

const createEventSource = (source: string) =>
  new EventSource(source, {
    headers: {
      authorization: `bearer ${getToken()}`,
      'cookie': envCookies(),
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

const matchSubject = (msg: Message, subject: string) => {
  return msg.subject.startsWith(subject)
    || msg.subject.startsWith('-')
    && (pathOr('', ['body', 'subject'], msg) as string).startsWith(subject)
}

const hasNoSubject = (msg: Message) => {
  return msg.subject.startsWith('-') && !path(['body', 'subject'], msg)
}

const filterMessage = (subject: string, logAny: boolean = false, senders?: string[]) => (msg: Message) => {
  return (matchSubject(msg, subject) || logAny && hasNoSubject(msg))
    && (!senders || contains(removeVersion(msg.sender), senders))
    && msg
}

const maybeCall = (callback: (message: Message) => void) => (msg: Message) => {
  if (msg) {
    callback(msg)
  }
}

const onLog = (ctx: Context, subject: string, logLevel: string, callback: (message: Message) => void, senders?: string[]): Unlisten => {
  const source = `${endpoint('colossus')}/${ctx.account}/${ctx.workspace}/logs?level=${logLevel}`
  const es = createEventSource(source)
  es.onopen = onOpen(`${logLevel} log`)
  es.onmessage = compose(maybeCall(callback), filterMessage(subject, true, senders), parseMessage)
  es.onerror = onError(`${logLevel} log`)
  return es.close.bind(es)
}

export const onEvent = (ctx: Context, sender: string, subject: string, keys: string[], callback: (message: Message) => void): Unlisten => {
  const source = `${endpoint('colossus')}/${ctx.account}/${ctx.workspace}/events?sender=${sender}${parseKeyToQueryParameter(keys)}`
  const es = createEventSource(source)
  es.onopen = onOpen('event')
  es.onmessage = compose(maybeCall(callback), filterMessage(subject), parseMessage)
  es.onerror = onError('event')
  return es.close.bind(es)
}

export const logAll = (context: Context, logLevel: string, id: string, senders?: string[]) => {
  const callback = ({ sender, level, body: { message, code, progress, scope, clear } }: Message) => {
    if (!(message || code || progress)) {
      return // Ignore logs without code or progress bar info.
    }
    log.log({ level, message, code, progress, sender, scope, clear })
  }

  return onLog(context, id, logLevel, callback, senders)
}

export const onAuth = (account: string, workspace: string, state: string, returnUrl: string): Promise<[string, string]> => {
  const source = `https://${workspace}--${account}.${publicEndpoint()}/_v//private/auth-server/v1/sse/${state}`
  const es = createEventSource(source)
  return new Promise((resolve, reject) => {
    es.onmessage = (msg: MessageJSON) => {
      const { body: token } = JSON.parse(msg.data) as { body: string }
      es.close()
      resolve([token, returnUrl])
    }

    es.onerror = (event) => {
      es.close()
      reject(new SSEConnectionError(`Connection to login server has failed with status ${event.status}`, event.status))
    }
  })
}
