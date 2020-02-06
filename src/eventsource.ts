import EventSource from 'eventsource'
import { forEach } from 'ramda'

// Colossus ping is set at 45s
const COLOSSUS_PING = 45000
const EPSILON = 5000
const BEFORE_NEXT_PING = COLOSSUS_PING - EPSILON
const AFTER_NEXT_PING = COLOSSUS_PING + EPSILON

const CONNECTION_CLOSED = 2
const DEFAULT_RECONNECT_INTERVAL = 1000
const MAX_RETRIES = 3

export default class CustomEventSource {
  public esOnError: (err: any) => void
  public esOnMessage: () => void
  public esOnOpen: () => void
  public esOnClose: () => void

  private configuration: any
  private events: any
  private eventSource: EventSource
  private isClosed: boolean
  private nRetries: number
  private pingStatus: any
  private reconnectInterval: number
  private source: string
  private timerAfterNextPing: any
  private timerBeforeNextPing: any

  constructor(source, configuration) {
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
    this.reconnectInterval = (this.eventSource && this.eventSource.reconnectInterval) || DEFAULT_RECONNECT_INTERVAL
  }

  set onopen(newOnOpen) {
    this.esOnOpen = newOnOpen
    this.esOnOpen = this.esOnOpen.bind(this)
    if (this.eventSource) {
      this.eventSource.onopen = this.esOnOpen
    }
  }

  set onclose(newOnClose) {
    this.esOnClose = newOnClose
    this.esOnClose = this.esOnClose.bind(this)
    if (this.eventSource) {
      this.eventSource.onclose = this.esOnClose
    }
  }

  set onmessage(newOnMessage) {
    this.esOnMessage = newOnMessage
    this.esOnMessage = this.esOnMessage.bind(this)
    if (this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
    }
  }

  set onerror(newOnError) {
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
    if (typeof this.esOnClose === 'function') {
      this.esOnClose()
    }
  }

  public handleError(err) {
    if (typeof this.esOnError === 'function') {
      this.esOnError(err)
    }

    this.nRetries += 1
    if (this.nRetries > MAX_RETRIES) {
      this.close()
    }

    if (!this.eventSource || (this.eventSource && this.eventSource.readyState === CONNECTION_CLOSED)) {
      setTimeout(this.reconnect, this.reconnectInterval)
    }
  }

  private addColossusPing() {
    if (this.eventSource) {
      this.eventSource.addEventListener('ping', this.checkPing)
    }
  }

  private addMethods() {
    if (this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
      this.eventSource.onopen = this.esOnOpen
      this.eventSource.onerror = this.handleError

      forEach(({ event, handler }) => {
        this.eventSource.addEventListener(event, handler)
      }, this.events)
    }
  }

  private checkPing() {
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
    if (!this.isClosed) {
      this.connectEventSource()
      this.addColossusPing()
      this.addMethods()
    }
  }
}
