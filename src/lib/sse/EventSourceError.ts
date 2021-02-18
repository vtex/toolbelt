import { ParseableError } from '@vtex/node-error-report/build/errorParsing'

interface EventSourceInfo {
  url: string
  readyState: number
  eventsCount: number
  errorCount: number
  pingEventsCount: number
  restartCount: number
  config: any
}

export class EventSourceError extends Error implements ParseableError {
  public event: any
  public eventSourceInfo: EventSourceInfo
  constructor(event: any, eventSourceInfo: EventSourceInfo) {
    super(`SSE error on endpoint ${eventSourceInfo.url}`)
    this.eventSourceInfo = eventSourceInfo
    this.event = { ...event }
  }

  public getDetailsObject() {
    return {
      event: this.event,
      eventSourceInfo: this.eventSourceInfo,
    }
  }
}
