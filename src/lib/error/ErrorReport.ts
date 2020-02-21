import { AxiosError } from 'axios'
import { randomBytes } from 'crypto'
import * as pkg from '../../../package.json'
import { SessionManager } from '../session/SessionManager'
import { ErrorCodes } from './ErrorCodes'

interface ErrorCreationArguments {
  code: string
  message: string
  originalError: Error | null
  tryToParseError?: boolean
}

interface ErrorReportArguments extends ErrorCreationArguments {
  code: string
  message: string
  originalError: Error | null
  tryToParseError?: boolean
  env: ErrorEnv
}

interface ErrorEnv {
  account: string
  workspace: string
  toolbeltVersion: string
  nodeVersion: string
  platform: string
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
  public static createGenericCode(error: AxiosError | Error | any) {
    if (error.config) {
      return ErrorCodes.REQUEST_ERROR
    }

    return ErrorCodes.GENERIC_ERROR
  }

  public static create(args: ErrorCreationArguments) {
    const { workspace, account } = SessionManager.getSessionManager()
    return new ErrorReport({
      ...args,
      env: {
        account,
        workspace,
        toolbeltVersion: pkg.version,
        nodeVersion: process.version,
        platform: process.platform,
      },
    })
  }

  private static getRequestErrorMetadata(err: AxiosError): RequestErrorDetails | null {
    if (!err.config) {
      return null
    }

    const { url, method, headers: requestHeaders, params, data: requestData, timeout: requestTimeout } =
      err?.config || {}

    const { status, statusText, headers: responseHeaders, data: responseData } = err?.response || {}

    return {
      requestConfig: {
        url,
        method,
        params,
        headers: requestHeaders,
        data: requestData,
        timeout: requestTimeout,
      },
      response: {
        status,
        statusText,
        headers: responseHeaders,
        data: responseData,
      },
    }
  }

  public readonly code: string
  public readonly originalError: Error
  public readonly errorDetails: any
  public readonly timestamp: string
  public readonly errorId: string
  public readonly env: ErrorEnv

  constructor({ code, message, originalError, tryToParseError = false, env }: ErrorReportArguments) {
    super(message)
    this.timestamp = new Date().toISOString()
    this.code = code
    this.originalError = originalError
    this.errorId = randomBytes(8).toString('hex')
    this.env = env

    this.errorDetails = ErrorReport.getRequestErrorMetadata(this.originalError as AxiosError)
    if (tryToParseError) {
      if (this.errorDetails?.response.data.message) {
        this.message = this.errorDetails?.response.data.message
      } else {
        this.message = this.originalError.message
      }
    }
  }

  public toObject() {
    return {
      errorId: this.errorId,
      timestamp: this.timestamp,
      code: this.code,
      message: this.message,
      errorDetails: this.errorDetails,
      stack: this.stack,
      env: this.env,
    }
  }
  public stringify(pretty = false) {
    if (pretty) {
      return JSON.stringify(this.toObject(), null, 2)
    }

    return JSON.stringify(this.toObject())
  }
}
