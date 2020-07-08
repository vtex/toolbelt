import { ErrorReportSerializableObj } from '@vtex/node-error-report'
import { randomBytes } from 'crypto'
import { ensureFileSync, writeJsonSync } from 'fs-extra'
import { join } from 'path'
import * as pkgJson from '../../../package.json'
import logger from '../../api/logger'
import { PathConstants } from '../../lib/constants/Paths'
import { ErrorReport } from '../../api/error/ErrorReport'
import { Metric, MetricReport, MetricReportObj } from '../../api/metrics/MetricReport'
import { spawnUnblockingChildProcess } from '../../lib/utils/spawnUnblockingChildProcess'
import { ITelemetryLocalStore, TelemetryLocalStore } from './TelemetryStore'

export interface TelemetryFile {
  errors?: ErrorReportSerializableObj[]
  metrics?: MetricReportObj[]
}

export class TelemetryCollector {
  private static readonly REMOTE_FLUSH_INTERVAL = 1000 * 60 * 10 // Ten minutes
  public static readonly TELEMETRY_LOCAL_DIR = PathConstants.TELEMETRY_FOLDER
  private static telemetryCollectorSingleton: TelemetryCollector

  public static getCollector() {
    if (!TelemetryCollector.telemetryCollectorSingleton) {
      const store = new TelemetryLocalStore(
        join(TelemetryCollector.TELEMETRY_LOCAL_DIR, `${pkgJson.name}-telemetry-store`)
      )

      TelemetryCollector.telemetryCollectorSingleton = new TelemetryCollector(store)
    }

    return TelemetryCollector.telemetryCollectorSingleton
  }

  private errors: ErrorReport[]
  private metrics: MetricReport[]
  constructor(private store: ITelemetryLocalStore) {
    this.errors = this.store.getErrors()
    this.metrics = this.store.getMetrics()
  }

  public registerError(error: ErrorReport | Error | any): ErrorReport {
    let errorReport: ErrorReport
    if (error instanceof ErrorReport) {
      errorReport = error
    } else {
      errorReport = ErrorReport.create({ originalError: error })
    }

    if (errorReport.isErrorReported()) {
      return errorReport
    }

    this.errors.push(errorReport)
    errorReport.markErrorAsReported()
    return errorReport
  }

  public registerMetric(metric: Metric): MetricReport {
    if (metric instanceof MetricReport) {
      this.metrics.push(metric)
      return metric
    }

    const metricReport = MetricReport.create(metric)
    this.metrics.push(metricReport)
    return metricReport
  }

  public flush(forceRemoteFlush = false) {
    const shouldRemoteFlush =
      forceRemoteFlush ||
      this.errors.length > 0 ||
      Date.now() - this.store.getLastRemoteFlush() >= TelemetryCollector.REMOTE_FLUSH_INTERVAL
    if (!shouldRemoteFlush) {
      this.store.setErrors(this.errors)
      this.store.setMetrics(this.metrics)
      return
    }

    this.store.setErrors([])
    this.store.setMetrics([])

    const obj: TelemetryFile = {
      errors: this.errors.map(err => err.toObject()),
      metrics: this.metrics.map(metric => metric.toObject()),
    }

    const objFilePath = join(TelemetryCollector.TELEMETRY_LOCAL_DIR, `${randomBytes(8).toString('hex')}.json`)
    try {
      ensureFileSync(objFilePath)
      writeJsonSync(objFilePath, obj) // Telemetry object should be saved in a file since it can be too large to be passed as a cli argument
      spawnUnblockingChildProcess(process.execPath, [
        join(__dirname, 'TelemetryReporter', 'report.js'),
        this.store.storeFilePath,
        objFilePath,
      ])
    } catch (e) {
      logger.error('Error writing telemetry file. Error: ', e)
    }
  }
}
