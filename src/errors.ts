import ExtendableError from 'es6-error/lib/index.ts.js'

export class CommandError extends ExtendableError {
  constructor (message = '') {
    super(message)
  }
}

export class SSEConnectionError extends ExtendableError {
  constructor (message: string) {
    super(message)
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
