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
