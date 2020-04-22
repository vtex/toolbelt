import { AxiosError } from 'axios'
import chalk from 'chalk'
import { randomBytes } from 'crypto'
import * as pkg from '../../../package.json'
import logger from '../../logger'
import { SessionManager } from '../session/SessionManager'
import { getPlatform } from '../utils/getPlatform'
import { truncateStringsFromObject } from '../utils/truncateStringsFromObject'
import { ErrorKinds } from './ErrorKinds'

export interface ErrorCreationArguments {
  kind?: string
  message?: string
  originalError: Error | null
  tryToParseError?: boolean
}

export interface ErrorReportObj {
  errorId: string
  timestamp: string
  kind: string
  message: string
  stack: string
  env: ErrorEnv
  errorDetails?: any
  code?: string
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

type ErrorLogLevel = 'error' | 'debug'
interface LogToUserOptions {
  coreLogLevelDefault?: ErrorLogLevel
  requestDataLogLevelDefault?: ErrorLogLevel
  logLevels?: {
    core?: {
      errorId?: ErrorLogLevel
      errorMessage?: ErrorLogLevel
      errorKind?: ErrorLogLevel
    }
    requestData?: {
      requestInfo?: ErrorLogLevel
      requestStatus?: ErrorLogLevel
    }
  }
}

export class ErrorReport extends Error {
  private static readonly MAX_ERROR_STRING_LENGTH = process.env.MAX_ERROR_STRING_LENGTH
    ? parseInt(process.env.MAX_ERROR_STRING_LENGTH, 10)
    : 1024

  private static readonly MAX_SERIALIZATION_DEPTH = 5

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
        platform: getPlatform(),
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
  public readonly errorDetails?: any
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

  public toObject(): ErrorReportObj {
    const errorReportObj: ErrorReportObj = {
      errorId: this.errorId,
      timestamp: this.timestamp,
      kind: this.kind,
      message: this.message,
      stack: this.stack,
      env: this.env,
      ...(this.errorDetails ? { errorDetails: this.errorDetails } : null),
      ...(this.originalError.code ? { code: this.originalError.code } : null),
    }

    return truncateStringsFromObject(
      errorReportObj,
      ErrorReport.MAX_ERROR_STRING_LENGTH,
      ErrorReport.MAX_SERIALIZATION_DEPTH
    ) as ErrorReportObj
  }

  public stringify(pretty = false) {
    if (pretty) {
      return JSON.stringify(this.toObject(), null, 2)
    }

    return JSON.stringify(this.toObject())
  }

  public logErrorForUser(opts?: LogToUserOptions) {
    const { coreLogLevelDefault, requestDataLogLevelDefault }: LogToUserOptions = {
      coreLogLevelDefault: opts?.coreLogLevelDefault ?? 'error',
      requestDataLogLevelDefault: opts?.requestDataLogLevelDefault ?? 'debug',
    }

    const coreLogLevels: LogToUserOptions['logLevels']['core'] = {
      errorId: coreLogLevelDefault,
      errorKind: coreLogLevelDefault,
      errorMessage: coreLogLevelDefault,
      ...opts?.logLevels?.core,
    }

    const requestDataLogLevels: LogToUserOptions['logLevels']['requestData'] = {
      requestInfo: requestDataLogLevelDefault,
      requestStatus: requestDataLogLevelDefault,
      ...opts?.logLevels?.requestData,
    }

    logger[coreLogLevels.errorKind](chalk`{bold ErrorKind:} ${this.kind}`)
    logger[coreLogLevels.errorMessage](chalk`{bold Message:} ${this.message}`)
    logger[coreLogLevels.errorId](chalk`{bold ErrorID:} ${this.errorId}`)

    if (this.errorDetails?.requestConfig) {
      const { method, url } = this.errorDetails.requestConfig
      logger[requestDataLogLevels.requestInfo](chalk`{bold Request:} ${method} ${url}`)

      if (this.errorDetails?.response) {
        const { status } = this.errorDetails.response
        logger[requestDataLogLevels.requestStatus](chalk`{bold Status:} ${status}`)
      }
    }

    return this
  }
}
