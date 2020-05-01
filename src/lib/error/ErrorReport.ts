import { AxiosError } from 'axios'
import chalk from 'chalk'
import { randomBytes } from 'crypto'
import * as pkg from '../../../package.json'
import logger from '../../logger'
import { SessionManager } from '../session/SessionManager'
import { getPlatform } from '../utils/getPlatform'
import { truncateAndSanitizeStringsFromObject } from '../utils/truncateAndSanitizeStringsFromObject'
import { ErrorKinds } from './ErrorKinds'
import { parseError } from './errorParsing'

interface ErrorReportArguments {
  kind: string
  originalError: Error
  env: ErrorEnv
  message?: string
  details?: Record<string, any>
}

export interface ErrorCreationArguments {
  kind?: ErrorReportArguments['kind']
  message?: ErrorReportArguments['message']
  details?: ErrorReportArguments['details']
  originalError: ErrorReportArguments['originalError']
}

export interface ErrorReportObj {
  kind: ErrorReportArguments['kind']
  message: ErrorReportArguments['message']
  env: ErrorReportArguments['env']
  details?: ErrorReportArguments['details']
  errorId: string
  timestamp: string
  stack: string
  parsedInfo?: Record<string, any>
  code?: string
}

interface ErrorEnv {
  account: string
  workspace: string
  toolbeltVersion: string
  nodeVersion: string
  platform: string
  command: string
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

  private static readonly MAX_SERIALIZATION_DEPTH = 8

  public static createGenericErrorKind(error: AxiosError | Error | any) {
    if (error.config) {
      return ErrorKinds.REQUEST_ERROR
    }

    return ErrorKinds.GENERIC_ERROR
  }

  public static create(args: ErrorCreationArguments) {
    const kind = args.kind ?? this.createGenericErrorKind(args.originalError)
    const message = args.message ?? args.originalError.message

    const { workspace, account } = SessionManager.getSessionManager()
    return new ErrorReport({
      kind,
      message,
      originalError: args.originalError,
      details: args.details,
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

  public readonly kind: ErrorReportArguments['kind']
  public readonly originalError: ErrorReportArguments['originalError']
  public readonly env: ErrorReportArguments['env']
  public readonly details?: ErrorReportArguments['details']
  public readonly parsedInfo?: Record<string, any>
  public readonly timestamp: string
  public readonly errorId: string

  constructor({ kind, message, originalError, env, details }: ErrorReportArguments) {
    super(message ?? originalError.message)
    this.timestamp = new Date().toISOString()
    this.kind = kind
    this.originalError = originalError
    this.errorId = randomBytes(8).toString('hex')
    this.stack = originalError.stack
    this.env = env
    this.parsedInfo = parseError(this.originalError)
    this.details = details
  }

  public toObject(): ErrorReportObj {
    const errorReportObj: ErrorReportObj = {
      errorId: this.errorId,
      timestamp: this.timestamp,
      kind: this.kind,
      message: this.message,
      stack: this.stack,
      env: this.env,
      ...(this.details ? { details: this.details } : null),
      ...(this.parsedInfo ? { parsedInfo: this.parsedInfo } : null),
      ...((this.originalError as any).code ? { code: (this.originalError as any).code } : null),
    }

    return truncateAndSanitizeStringsFromObject(
      errorReportObj,
      ErrorReport.MAX_ERROR_STRING_LENGTH,
      ErrorReport.MAX_SERIALIZATION_DEPTH
    ) as ErrorReportObj
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

    if (this.parsedInfo?.requestConfig) {
      const { method, url } = this.parsedInfo.requestConfig
      logger[requestDataLogLevels.requestInfo](chalk`{bold Request:} ${method} ${url}`)

      if (this.parsedInfo?.response) {
        const { status } = this.parsedInfo.response
        logger[requestDataLogLevels.requestStatus](chalk`{bold Status:} ${status}`)
      }
    }

    return this
  }
}
