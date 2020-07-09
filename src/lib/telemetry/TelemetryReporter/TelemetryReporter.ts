import { ErrorReportSerializableObj } from '@vtex/node-error-report'
import { readJson, remove } from 'fs-extra'
import { ToolbeltTelemetry } from '../../../api/clients/IOClients/apps/ToolbeltTelemetry'
import { ErrorKinds } from '../../../api/error/ErrorKinds'
import { ErrorReport } from '../../../api/error/ErrorReport'
import { MetricReportObj } from '../../../api/metrics/MetricReport'
import { TelemetryFile } from '../TelemetryCollector'
import { PendingTelemetryDataManager } from './PendingTelemetryDataManager'

export class TelemetryReporter {
  private static readonly RETRIES = 3
  private static readonly TIMEOUT = 30 * 1000
  public static getTelemetryReporter() {
    const telemetryClient = ToolbeltTelemetry.createClient(
      {},
      { retries: TelemetryReporter.RETRIES, timeout: TelemetryReporter.TIMEOUT }
    )

    return new TelemetryReporter(telemetryClient)
  }

  private pendingDataManager: PendingTelemetryDataManager

  constructor(private telemetryClient: ToolbeltTelemetry) {
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
            this.registerMetaError(err)
          }
        })
      )

      await this.pendingDataManager.releaseLock()
    } catch (err) {
      this.registerMetaError(err)
    }
  }

  private async reportErrors(errors: ErrorReportSerializableObj[]) {
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

  private registerMetaError(error: Error | any) {
    this.pendingDataManager.registerPendingFile({
      errors: [
        ErrorReport.create({
          kind: ErrorKinds.TELEMETRY_REPORTER_ERROR,
          originalError: error,
        }).toObject(),
      ],
    })
  }
}
