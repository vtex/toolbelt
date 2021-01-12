import EventSource from 'eventsource'
import { cluster, envCookies } from '../../api/env'
import userAgent from '../../user-agent'
import { Headers } from '../../api/constants/Headers'
import { SessionManager } from '../../api/session/SessionManager'
import { EventSourceError } from './EventSourceError'
import { TraceConfig } from '../globalConfigs/traceConfig'

// Colossus ping is set at 45s
const COLOSSUS_PING = 45000
const EPSILON = 5000
const BEFORE_NEXT_PING = COLOSSUS_PING - EPSILON
const AFTER_NEXT_PING = COLOSSUS_PING + EPSILON

const CONNECTION_CLOSED = 2
const DEFAULT_RECONNECT_INTERVAL = 1000
const MAX_RETRIES = 3

interface EventListeners {
  event: string
  handler: any
}

interface CustomEventSourceOptions {
  source: string
  additionalHeaders?: Record<string, any>
  closeOnInvalidToken?: boolean
}

type OnMessageHandler = (data: any) => void
type OnErrorHandler = (err: EventSourceError) => void
type OnOpenHandler = () => void

export class CustomEventSource {
  public static create(opts: CustomEventSourceOptions) {
    const { source, closeOnInvalidToken = false, additionalHeaders = {} } = opts
    const traceHeader = TraceConfig.shouldTrace() ? { [Headers.VTEX_TRACE]: TraceConfig.jaegerDebugID } : null

    let token
    if (closeOnInvalidToken) {
      token = SessionManager.getSingleton().checkAndGetToken(closeOnInvalidToken)
    } else {
      token = SessionManager.getSingleton().token
    }

    return new CustomEventSource(source, {
      headers: {
        authorization: `bearer ${token}`,
        'user-agent': userAgent,
        ...(envCookies() ? { cookie: envCookies() } : null),
        ...(cluster() ? { [Headers.VTEX_UPSTREAM_TARGET]: cluster() } : null),
        ...additionalHeaders,
        ...traceHeader,
      },
    })
  }

  public esOnError: OnErrorHandler
  public esOnMessage: OnMessageHandler
  public esOnOpen: OnOpenHandler

  private configuration: EventSource.EventSourceInitDict
  private events: EventListeners[]
  private eventSource: EventSource
  private isClosed: boolean
  private nRetries: number
  private pingStatus: any
  private reconnectInterval: number
  private source: string
  private timerAfterNextPing: any
  private timerBeforeNextPing: any

  private restartCount = 0
  private errorCount = 0
  private pingEventsCount = 0

  constructor(source: string, configuration: EventSource.EventSourceInitDict) {
    this.source = source
    this.configuration = configuration

    this.events = []
    this.eventSource = null
    this.isClosed = false
    this.nRetries = 0
    this.pingStatus = {}

    this.checkPing = this.checkPing.bind(this)
    this.handleError = this.handleError.bind(this)
    this.reconnect = this.reconnect.bind(this)

    this.connectEventSource()
    this.addColossusPing()
    this.reconnectInterval = (this.eventSource as any)?.reconnectInterval || DEFAULT_RECONNECT_INTERVAL
  }

  set onopen(newOnOpen: OnOpenHandler) {
    this.esOnOpen = newOnOpen
    this.esOnOpen = this.esOnOpen.bind(this)
    if (this.eventSource) {
      this.eventSource.onopen = this.esOnOpen
    }
  }

  set onmessage(newOnMessage: OnMessageHandler) {
    this.esOnMessage = newOnMessage
    this.esOnMessage = this.esOnMessage.bind(this)
    if (this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
    }
  }

  set onerror(newOnError: OnErrorHandler) {
    this.esOnError = newOnError
    this.esOnError = this.esOnError.bind(this)
    if (this.eventSource) {
      this.eventSource.onerror = this.handleError
    }
  }

  public addEventListener(event: string, handler: any) {
    this.events.push({ event, handler })

    if (this.eventSource) {
      this.eventSource.addEventListener(event, handler)
    }
  }

  public close() {
    this.closeEventSource()
    this.clearTimers()
    this.isClosed = true
  }

  public handleError(err: any) {
    this.errorCount += 1
    if (typeof this.esOnError === 'function') {
      this.esOnError(this.createError(err))
    }

    this.nRetries += 1
    if (this.nRetries > MAX_RETRIES) {
      this.close()
    }

    if (!this.eventSource || this.eventSource?.readyState === CONNECTION_CLOSED) {
      setTimeout(this.reconnect, this.reconnectInterval)
    }
  }

  private createError(err: any) {
    return new EventSourceError(err, {
      readyState: this.eventSource.readyState,
      url: this.eventSource.url,
      eventsCount: (this.eventSource as any)._eventsCount,
      errorCount: this.errorCount,
      pingEventsCount: this.pingEventsCount,
      restartCount: this.restartCount,
      config: this.configuration,
    })
  }

  private addColossusPing() {
    if (this.eventSource) {
      this.eventSource.addEventListener('ping', this.checkPing)
    }
  }

  private addMethods() {
    if (!this.eventSource) {
      return
    }
    this.eventSource.onmessage = this.esOnMessage
    this.eventSource.onopen = this.esOnOpen
    this.eventSource.onerror = this.handleError

    this.events.forEach(({ event, handler }) => {
      this.eventSource.addEventListener(event, handler)
    })
  }

  private checkPing() {
    this.pingEventsCount += 1
    this.nRetries = 0
    this.pingStatus = true
    this.timerBeforeNextPing = setTimeout(() => {
      this.pingStatus = false
    }, BEFORE_NEXT_PING)
    this.timerAfterNextPing = setTimeout(() => !this.pingStatus && this.reconnect(), AFTER_NEXT_PING)
  }

  private clearTimers() {
    clearTimeout(this.timerBeforeNextPing)
    clearTimeout(this.timerAfterNextPing)
  }

  private closeEventSource() {
    if (this.eventSource) {
      this.eventSource.close()
    }
  }

  private connectEventSource() {
    this.closeEventSource()
    this.eventSource = new EventSource(this.source, this.configuration)
  }

  private reconnect() {
    if (this.isClosed) {
      return
    }

    this.restartCount += 1
    this.connectEventSource()
    this.addColossusPing()
    this.addMethods()
  }
}
