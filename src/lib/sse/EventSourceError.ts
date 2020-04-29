interface EventSourceInfo {
  url: string
  readyState: number
  eventsCount: number
  errorCount: number
  pingEventsCount: number
  restartCount: number
  config: any
}

export class EventSourceError extends Error {
  public event: any
  public eventSourceInfo: EventSourceInfo
  constructor(event: any, eventSourceInfo: EventSourceInfo) {
    super(`SSE error on endpoint ${eventSourceInfo.url}`)
    this.eventSourceInfo = eventSourceInfo
    this.event = { ...event }
  }

  public getErrorDetailsObject() {
    return {
      event: this.event,
      eventSourceInfo: this.eventSourceInfo,
    }
  }
}
