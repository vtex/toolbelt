import ExtendableError from 'extendable-error'

export class CommandError extends ExtendableError {
  public message

  constructor (message = '') {
    super(message)
  }
}

export class SSEConnectionError extends ExtendableError {
  statusCode: number
  constructor (message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BuildFailError extends ExtendableError {
  public code: string
  public message: string

  constructor (eventMessage: Message) {
    const {message = 'Build fail', code = 'unknown'} = eventMessage.body || {}
    super(message)
    this.message = message
    this.code = code
  }
}
