import { AxiosError } from 'axios'
import { randomBytes } from 'crypto'
import * as pkg from '../../../package.json'
import { SessionManager } from '../session/SessionManager'
import { ErrorKinds } from './ErrorKinds'

interface ErrorCreationArguments {
  kind?: string
  message?: string
  originalError: Error | null
  tryToParseError?: boolean
}

interface ErrorReportArguments {
  kind: string
  message: string
  originalError: Error | null
  tryToParseError: boolean
  env: ErrorEnv
}

interface ErrorEnv {
  account: string
  workspace: string
  toolbeltVersion: string
  nodeVersion: string
  platform: string
  command: string
}

interface RequestErrorDetails {
  requestConfig: {
    url?: string
    method?: string
    params?: any
    headers?: Record<string, any>
    data?: any
    timeout?: string | number
  }
  response: {
    status?: number
    statusText?: string
    headers?: Record<string, any>
    data?: any
  }
}

export class ErrorReport extends Error {
  private static readonly MAX_ERROR_STRING_LENGTH = process.env.MAX_ERROR_STRING_LENGTH
    ? parseInt(process.env.MAX_ERROR_STRING_LENGTH, 10)
    : 1024

  public static createGenericErrorKind(error: AxiosError | Error | any) {
    if (error.config) {
      return ErrorKinds.REQUEST_ERROR
    }

    return ErrorKinds.GENERIC_ERROR
  }

  public static create(args: ErrorCreationArguments) {
    const kind = args.kind ?? this.createGenericErrorKind(args.originalError)
    const message = args.message ?? args.originalError.message
    const tryToParseError = args.tryToParseError ?? true

    const { workspace, account } = SessionManager.getSessionManager()
    return new ErrorReport({
      kind,
      message,
      tryToParseError,
      originalError: args.originalError,
      env: {
        account,
        workspace,
        toolbeltVersion: pkg.version,
        nodeVersion: process.version,
        platform: process.platform,
        command: process.argv.slice(2).join(' '),
      },
    })
  }

  private static getRequestErrorMetadata(err: AxiosError): RequestErrorDetails | null {
    if (!err.config) {
      return null
    }

    const { url, method, headers: requestHeaders, params, data: requestData, timeout: requestTimeout } = err.config
    const { status, statusText, headers: responseHeaders, data: responseData } = err.response || {}

    return {
      requestConfig: {
        url,
        method,
        params,
        headers: requestHeaders,
        data: requestData,
        timeout: requestTimeout,
      },
      response: err.response
        ? {
            status,
            statusText,
            headers: responseHeaders,
            data: responseData,
          }
        : undefined,
    }
  }

  public readonly kind: string
  public readonly originalError: Error | any
  public readonly errorDetails: any
  public readonly timestamp: string
  public readonly errorId: string
  public readonly env: ErrorEnv

  constructor({ kind, message, originalError, tryToParseError = false, env }: ErrorReportArguments) {
    super(message)
    this.timestamp = new Date().toISOString()
    this.kind = kind
    this.originalError = originalError
    this.errorId = randomBytes(8).toString('hex')
    this.stack = originalError.stack
    this.env = env

    this.errorDetails = ErrorReport.getRequestErrorMetadata(this.originalError as AxiosError)
    if (tryToParseError) {
      if (this.errorDetails?.response?.data?.message) {
        this.message = this.errorDetails.response.data.message
      } else {
        this.message = this.originalError.message
      }
    }
  }

  public toObject() {
    return this.truncateStringsFromObject({
      errorId: this.errorId,
      timestamp: this.timestamp,
      kind: this.kind,
      message: this.message,
      errorDetails: this.errorDetails,
      stack: this.stack,
      env: this.env,
      ...(this.originalError.code ? { code: this.originalError.code } : null),
    })
  }

  private truncateStringsFromObject(element: any, maxStrSize: number = ErrorReport.MAX_ERROR_STRING_LENGTH) {
    if(element === null || element === undefined) {
      return element
    }
    if(typeof element === 'object') {
      Object.keys(element).forEach((key) => {
        element[key] = this.truncateStringsFromObject(element[key], maxStrSize)
      })
      return element
    }
    if(Array.isArray(element)) {
      element.forEach((elementFromArray, index) => {
        element[index] = this.truncateStringsFromObject(elementFromArray, maxStrSize)
      })
      return element
    }
    if(typeof element === 'string' && element.length > maxStrSize) {
      return `${element.substr(0, maxStrSize)}[...TRUNCATED]`
    }
    return element
  }

  public stringify(pretty = false) {
    if (pretty) {
      return JSON.stringify(this.toObject(), null, 2)
    }

    return JSON.stringify(this.toObject())
  }
}
