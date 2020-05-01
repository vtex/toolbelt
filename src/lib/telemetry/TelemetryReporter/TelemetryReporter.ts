import { readJson, remove } from 'fs-extra'
import { TelemetryClient } from '../../../clients/telemetryClient'
import { region } from '../../../env'
import userAgent from '../../../user-agent'
import { createIOContext, createTelemetryClient } from '../../clients'
import { ErrorKinds } from '../../error/ErrorKinds'
import { ErrorCreationArguments, ErrorReport, ErrorReportObj } from '../../error/ErrorReport'
import { MetricReportObj } from '../../metrics/MetricReport'
import { SessionManager } from '../../session/SessionManager'
import { TelemetryFile } from '../TelemetryCollector'
import { PendingTelemetryDataManager } from './PendingTelemetryDataManager'

export class TelemetryReporter {
  private static readonly RETRIES = 3
  private static readonly TIMEOUT = 30 * 1000
  public static getTelemetryReporter() {
    const { account, workspace, token } = SessionManager.getSessionManager()
    const telemetryClient = createTelemetryClient(
      createIOContext({
        account,
        workspace,
        authToken: token,
        userAgent,
        region: region(),
      }),
      { retries: TelemetryReporter.RETRIES, timeout: TelemetryReporter.TIMEOUT }
    )

    return new TelemetryReporter(telemetryClient)
  }

  private pendingDataManager: PendingTelemetryDataManager

  constructor(private telemetryClient: TelemetryClient) {
    this.pendingDataManager = PendingTelemetryDataManager.getSingleton()
  }

  public async reportTelemetryFile(telemetryObjFilePath: string) {
    try {
      const { errors, metrics }: TelemetryFile = await readJson(telemetryObjFilePath)
      await this.reportErrors(errors)
      await this.reportMetrics(metrics)
      await remove(telemetryObjFilePath)
    } catch (err) {
      this.registerMetaError(err)
    }
  }

  public async moveTelemetryFileToPendingData(telemetryObjFilePath: string) {
    try {
      await this.pendingDataManager.acquireLock()
      await this.pendingDataManager.moveTelemetryFileToPending(telemetryObjFilePath)
      await this.pendingDataManager.releaseLock()
      await remove(telemetryObjFilePath)
    } catch (err) {
      this.registerMetaError(err)
    }
  }

  public async sendPendingData() {
    try {
      await this.pendingDataManager.acquireLock()

      await this.pendingDataManager.createPendingDirMetrics()
      const pendingFiles = await this.pendingDataManager.getFilePaths()

      await Promise.all(
        pendingFiles.map(async pendingFilePath => {
          try {
            const { errors, metrics }: TelemetryFile = await readJson(pendingFilePath)
            await this.reportErrors(errors)
            await this.reportMetrics(metrics)
            await remove(pendingFilePath)
          } catch (err) {
            this.registerMetaError(err, { step: 'sendPendingData', pendingFilePath })
          }
        })
      )

      await this.pendingDataManager.releaseLock()
    } catch (err) {
      this.registerMetaError(err)
    }
  }

  private async reportErrors(errors: ErrorReportObj[]) {
    if (!errors?.length) {
      return
    }

    try {
      await this.telemetryClient.reportErrors(errors)
    } catch (err) {
      this.handleReportingError({ errors }, err)
    }
  }

  private async reportMetrics(metrics: MetricReportObj[]) {
    if (!metrics?.length) {
      return
    }

    try {
      await this.telemetryClient.reportMetrics(metrics)
    } catch (err) {
      this.handleReportingError({ metrics }, err)
    }
  }

  private handleReportingError(pendingObject: TelemetryFile, reportingError: Error | any) {
    this.pendingDataManager.registerPendingFile(pendingObject)
    this.registerMetaError(reportingError)
  }

  private registerMetaError(error: Error, details?: ErrorCreationArguments['details']) {
    const errObj = ErrorReport.create({
      kind: ErrorKinds.TELEMETRY_REPORTER_ERROR,
      originalError: error,
      details,
    }).toObject()
    console.error(`Registering ${ErrorKinds.TELEMETRY_REPORTER_ERROR}: ${errObj.message}`)

    this.pendingDataManager.registerPendingFile({
      errors: [errObj],
    })
  }
}
