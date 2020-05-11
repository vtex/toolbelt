import {
  createErrorReportBaseArgs,
  ErrorReportBase,
  ErrorReportBaseConstructorArgs,
  ErrorReportCreateArgs,
  isRequestInfo,
} from '@vtex/node-error-report'
import chalk from 'chalk'
import * as pkg from '../../../package.json'
import logger from '../../logger'
import { SessionManager } from '../session/SessionManager'
import { getPlatform } from '../utils/getPlatform'
import { TelemetryCollector } from '../telemetry/TelemetryCollector'

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

export class ErrorReport extends ErrorReportBase {
  public static create(args: ErrorReportCreateArgs) {
    return new ErrorReport(createErrorReportBaseArgs(args))
  }

  public static createAndRegisterOnTelemetry(args: ErrorReportCreateArgs) {
    return ErrorReport.create(args).sendToTelemetry()
  }

  constructor(args: ErrorReportBaseConstructorArgs) {
    const { workspace, account } = SessionManager.getSingleton()

    const env: ErrorEnv = {
      account,
      workspace,
      toolbeltVersion: pkg.version,
      nodeVersion: process.version,
      platform: getPlatform(),
      command: process.argv.slice(2).join(' '),
    }

    super({
      ...args,
      details: {
        ...args.details,
        env,
      },
    })
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
    logger[coreLogLevels.errorId](chalk`{bold ErrorID:} ${this.metadata.errorId}`)

    if (isRequestInfo(this.parsedInfo)) {
      const { method, url } = this.parsedInfo.requestConfig
      logger[requestDataLogLevels.requestInfo](chalk`{bold Request:} ${method} ${url}`)

      if (this.parsedInfo.response) {
        const { status } = this.parsedInfo.response
        logger[requestDataLogLevels.requestStatus](chalk`{bold Status:} ${status.toString()}`)
      }
    }

    return this
  }

  public sendToTelemetry() {
    if (!this.isErrorReported()) {
      TelemetryCollector.getCollector().registerError(this)
    }

    return this
  }
}
