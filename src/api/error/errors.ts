import ExtendableError from 'extendable-error'
import { compose, join, map, prop, reject } from 'ramda'
import { isFunction } from 'ramda-adjunct'

const joinErrorMessages = compose<any[], any[], string[], string>(join('\n'), map(prop('message')), reject(isFunction))

export class SSEConnectionError extends ExtendableError {
  public statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BuildFailError extends ExtendableError {
  public code: string
  public message: string

  constructor(eventMessage: Message) {
    const { message = 'Build fail', code = 'unknown' } = eventMessage.body || {}
    super(message)
    this.message = message
    this.code = code
  }
}

export class GraphQlError extends ExtendableError {
  constructor(errors: [any]) {
    const message = joinErrorMessages(errors)
    super(message)
  }
}

export class BuilderHubTimeoutError extends ExtendableError {
  public code: string
  public message: string

  constructor(message: string) {
    super(message)
    this.code = 'builder_hub_timeout'
    this.message = message
  }
}
