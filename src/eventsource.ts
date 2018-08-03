import * as EventSource from 'eventsource'
import { forEach } from 'ramda'

// Colossus ping is set at 45s
const COLOSSUS_PING = 45000
const EPSILON = 5000
const BEFORE_NEXT_PING = COLOSSUS_PING - EPSILON
const AFTER_NEXT_PING = COLOSSUS_PING + EPSILON

const CONNECTION_CLOSED = 2
const DEFAULT_RECONNECT_INTERVAL = 1000

export default class CustomEventSource {
  public esOnError: (err: any) => void
  public esOnMessage: () => void
  public esOnOpen: () => void

  private configuration: any
  private events: any
  private eventSource: EventSource
  private reconnectInterval: number
  private source: string
  private status: any

  constructor (source, configuration) {
    this.source = source
    this.configuration = configuration

    this.events = []
    this.eventSource = null
    this.status = {}

    this.eventHandler = this.eventHandler.bind(this)
    this.handleError = this.handleError.bind(this)
    this.reconnect = this.reconnect.bind(this)

    this.connectEventSource()
    this.reconnectInterval = this.eventSource &&
      this.eventSource.reconnectInterval ||
      DEFAULT_RECONNECT_INTERVAL
  }

  set onopen (newOnOpen) {
    this.esOnOpen = newOnOpen
    this.esOnOpen = this.esOnOpen.bind(this)
    if (this.eventSource) {
      this.eventSource.onopen = this.esOnOpen
    }
  }

  set onmessage (newOnMessage) {
    this.esOnMessage = newOnMessage
    this.esOnMessage = this.esOnMessage.bind(this)
    if(this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
    }
  }

  set onerror (newOnError) {
    this.esOnError = newOnError
    this.esOnError = this.esOnError.bind(this)
    if (this.eventSource) {
      this.eventSource.onerror = this.handleError
    }
  }

  public addEventListener (event: string, handler: any, checkStatus: boolean = false) {
    this.events.push({event, handler, checkStatus})

    if (this.eventSource) {
      this.eventSource.addEventListener(
        event,
        () => this.eventHandler(event, handler, checkStatus))
    }
  }

  public close () {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  public handleError (err) {
    if (typeof this.esOnError === 'function') {
      this.esOnError(err)
    }
    if (!this.eventSource ||
        this.eventSource &&
        this.eventSource.readyState === CONNECTION_CLOSED) {
      setTimeout(this.reconnect, this.reconnectInterval)
    }
  }

  private addMethods () {
    if (this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
      this.eventSource.onopen = this.esOnOpen
      this.eventSource.onerror = this.handleError

      forEach(({event, handler, checkStatus}) => {
        this.eventSource.addEventListener(
          event,
          () => this.eventHandler(event, handler, checkStatus)
        )
      }, this.events)
    }
  }

  private connectEventSource () {
    this.close()
    this.eventSource = new EventSource(
      this.source,
      this.configuration
    )
  }

  private eventHandler(event: string, handler: any, checkStatus: boolean) {
    if (handler && typeof handler === 'function') {
      handler()
    }
    if (checkStatus) {
      this.status[event] = true
      setTimeout(
        () => { this.status[event] = false },
        BEFORE_NEXT_PING
      )
      setTimeout(
        () => !this.status[event] && this.reconnect(),
        AFTER_NEXT_PING
      )
    }
  }

  private reconnect () {
    this.connectEventSource()
    this.addMethods()
  }
}
