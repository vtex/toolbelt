import chalk from 'chalk'
import { compose, contains, forEach, path, pathOr } from 'ramda'
import { getToken } from './conf'
import { colossusEndpoint, envCookies, publicEndpoint, cluster } from './env'
import { SSEConnectionError } from './errors'
import EventSource from './eventsource'
import { removeVersion } from './locator'
import log from './logger'
import userAgent from './user-agent'
import { isVerbose } from './utils'

const levelAdapter = { warning: 'warn' }

const onOpen = type => () => log.debug(`Connected to ${type} server`)

const onError = type => err => log.error(`Connection to ${type} server has failed with status ${err.status}`)

const parseMessage = (msg: MessageJSON): Message => {
  const { sender, subject, level, body }: Message = JSON.parse(msg.data)
  return {
    body,
    level: levelAdapter[level] || level,
    sender,
    subject,
  }
}

const createEventSource = (source: string) => {
  return new EventSource(source, {
    headers: {
      authorization: `bearer ${getToken()}`,
      cookie: envCookies(),
      'user-agent': userAgent,
      ...(cluster() ? { 'x-vtex-upstream-target': cluster() } : null),
    },
  })
}

const parseKeyToQueryParameter = (keys: string[]): string => {
  let urlQueryParameters = ''
  forEach(key => {
    urlQueryParameters += `&keys=${key}`
  }, keys)
  return urlQueryParameters
}

const matchSubject = (msg: Message, subject: string) => {
  return (
    msg.subject.startsWith(subject) ||
    (msg.subject.startsWith('-') && (pathOr('', ['body', 'subject'], msg) as string).startsWith(subject))
  )
}

const hasNoSubject = (msg: Message) => {
  return msg.subject.startsWith('-') && !path(['body', 'subject'], msg)
}

const filterMessage = (subject: string, logAny = false, senders?: string[]) => (msg: Message) => {
  return (
    (matchSubject(msg, subject) || (logAny && hasNoSubject(msg))) &&
    (!senders || contains(removeVersion(msg.sender), senders)) &&
    msg
  )
}

const maybeCall = (callback: (message: Message) => void) => (msg: Message) => {
  if (msg) {
    callback(msg)
  }
}

const onLog = (
  ctx: Context,
  subject: string,
  logLevel: string,
  callback: (message: Message) => void,
  senders?: string[]
): Unlisten => {
  const source = `${colossusEndpoint()}/${ctx.account}/${ctx.workspace}/logs?level=${logLevel}`
  const es = createEventSource(source)
  es.onopen = onOpen(`${logLevel} log`)
  es.onmessage = compose(maybeCall(callback), filterMessage(subject, true, senders), parseMessage)
  es.onerror = onError(`${logLevel} log`)
  return es.close.bind(es)
}

export const onEvent = (
  ctx: Context,
  sender: string,
  subject: string,
  keys: string[],
  callback: (message: Message) => void
): Unlisten => {
  const source = `${colossusEndpoint()}/${ctx.account}/${
    ctx.workspace
  }/events?onUnsubscribe=link_interrupted&sender=${sender}${parseKeyToQueryParameter(keys)}`
  const es = createEventSource(source)
  es.onopen = onOpen('event')
  es.onmessage = compose(maybeCall(callback), filterMessage(subject), parseMessage)
  es.onerror = onError('event')
  return es.close.bind(es)
}

const filterAndMaybeLogVTEXLogs = (message: string) => {
  // Because stdout is buffered, __VTEX_IO_LOG objects might be interpolated with regular stdout messages.
  if (!message) {
    return ''
  }

  return (
    message
      .split('\n')
      .map((m: string) => {
        try {
          const obj = JSON.parse(m)
          if (obj.__VTEX_IO_LOG) {
            if (isVerbose) {
              delete obj.__VTEX_IO_LOG
              console.log(chalk.dim('// The following object was logged to Splunk:'))
              console.log(obj)
            }
            return ''
          } else {
            // Not a log object, just return original string
            return m
          }
        } catch (e) {
          // Not an object, just return original string
          return m
        }
      })
      .filter(s => s !== '')
      // Undo split
      .join('\n')
  )
}

export const logAll = (context: Context, logLevel: string, id: string, senders?: string[]) => {
  let previous = ''
  const callback = ({ sender, level, body: { message: rawMessage, code } }: Message) => {
    if (!(rawMessage || code)) {
      return // Ignore logs without message or code.
    }

    const message = filterAndMaybeLogVTEXLogs(rawMessage)
    if (!message) {
      return
    }

    const suffix = sender.startsWith(id) ? '' : ' ' + chalk.gray(sender)
    const formatted = (message || code || '').replace(/\n\s*$/, '') + suffix
    if (previous !== formatted) {
      previous = formatted
      log.log(level, formatted)
    }
  }

  return onLog(context, id, logLevel, callback, senders)
}

export const onAuth = (
  account: string,
  workspace: string,
  state: string,
  returnUrl: string
): Promise<[string, string]> => {
  const source = `https://${workspace}--${account}.${publicEndpoint()}/_v/private/auth-server/v1/sse/${state}`
  log.debug(`Listening for auth events from: ${source}`)
  const es = createEventSource(source)
  return new Promise((resolve, reject) => {
    es.onmessage = (msg: MessageJSON) => {
      const { body: token } = JSON.parse(msg.data) as { body: string }
      es.close()
      resolve([token, returnUrl])
    }

    es.onerror = event => {
      es.close()
      const errMessage = 'Connection to login server has failed' + (event.status ? ` with status ${event.status}` : '')
      reject(new SSEConnectionError(errMessage, event.status))
    }
  })
}
