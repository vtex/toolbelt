import * as EventSource from 'eventsource'
import { forEach } from 'ramda'

const CONNECTION_CLOSED = 2
const DEFAULT_RECONNECT_INTERVAL = 1000

export default class CustomEventSource {
  private source: string
  private configuration: any

  private esOnError: any
  private esOnMessage: any
  private esOnOpen: any
  private events: any
  private eventSource: EventSource
  private reconnectInterval: number

  constructor (source, configuration) {
    this.source = source
    this.configuration = configuration
    this.events = []
    this.eventSource = null
    this.reconnect = this.reconnect.bind(this)

    this.makeNewEventSource()
    this.reconnectInterval = this.eventSource &&
      this.eventSource.reconnectInterval ||
      DEFAULT_RECONNECT_INTERVAL
  }

  set onopen (newOnOpen) {
    this.esOnOpen = newOnOpen
    if (this.eventSource) {
      this.eventSource.onopen = newOnOpen
    }
  }

  set onmessage (newOnMessage) {
    this.esOnMessage = newOnMessage
    if(this.eventSource) {
      this.eventSource.onmessage = newOnMessage
    }
  }

  set onerror (newOnError) {
    this.esOnError = newOnError
    if (this.eventSource) {
      this.eventSource.onerror = this.handleError
    }
  }

  public close () {
    this.eventSource.close()
    this.eventSource = null
  }

  public addEventListener (event: string, handler: any) {
    this.events.push({event, handler})
    if (this.eventSource) {
      this.eventSource.addEventListener(event, handler)
    }
  }

  private addMethods () {
    if (this.eventSource) {
      this.eventSource.onmessage = this.esOnMessage
      this.eventSource.onopen = this.esOnOpen
      this.eventSource.onerror = this.handleError

      forEach(({event, handler}) => {
        this.eventSource.addEventListener(event, handler)
      }, this.events)
    }
  }

  private handleError (err) {
    this.esOnError(err)
    if (this.eventSource &&
        this.eventSource.readyState === CONNECTION_CLOSED) {
      setTimeout(this.reconnect, this.reconnectInterval)
    }
  }

  private makeNewEventSource () {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.eventSource = new EventSource(
      this.source,
      this.configuration
    )
  }

  private reconnect () {
    this.makeNewEventSource()
    this.addMethods()
  }
}
