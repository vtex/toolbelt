import chalk from 'chalk'
import { compose, contains, forEach, path, pathOr } from 'ramda'
import { colossusEndpoint } from '../../api/env'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { removeVersion } from '../../api/locator'
import log from '../../api/logger'
import { isVerbose } from '../../api/verbose'
import { CustomEventSource } from './CustomEventSource'
import { EventSourceError } from './EventSourceError'

const levelAdapter = { warning: 'warn' }

const onOpen = (type: string) => () => log.debug(`Connected to ${type} server`)

const onError = (type: string) => (err: EventSourceError) => {
  log.error(`Connection to ${type} server has failed with status ${err.event.status}`)
  ErrorReport.createAndMaybeRegisterOnTelemetry({
    kind: ErrorKinds.SSE_ERROR,
    originalError: err,
  }).logErrorForUser({ coreLogLevelDefault: 'debug', logLevels: { core: { errorId: 'error' } } })
}

const parseMessage = (msg: MessageJSON): Message => {
  const { sender, subject, level, body }: Message = JSON.parse(msg.data)
  return {
    body,
    level: levelAdapter[level] || level,
    sender,
    subject,
  }
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
  const es = CustomEventSource.create({ source, closeOnInvalidToken: true })
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
  const es = CustomEventSource.create({ source, closeOnInvalidToken: true })
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
          }
          // Not a log object, just return original string
          return m
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

    const suffix = sender.startsWith(id) ? '' : ` ${chalk.gray(sender)}`
    const formatted = (message || code || '').replace(/\n\s*$/, '') + suffix
    if (previous !== formatted) {
      previous = formatted
      log.log(level, formatted)
    }
  }

  return onLog(context, id, logLevel, callback, senders)
}
