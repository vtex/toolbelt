import { randomBytes } from 'crypto'
import { ensureFile, writeJson } from 'fs-extra'
import { spawn } from 'child_process'
import { join } from 'path'

import * as pkgJson from '../../../package.json'
import { ErrorReport } from '../error/ErrorReport'
import { ITelemetryLocalStore, TelemetryLocalStore } from './TelemetryStore'
import { configDir } from '../../conf'
import logger from '../../logger'
import { Metric, MetricReport, metricToMetricReport } from '../metrics/MetricReport'

export class TelemetryCollector {
  private static readonly REMOTE_FLUSH_INTERVAL = 1000 * 60 * 10 // Ten minutes
  public static readonly TELEMETRY_LOCAL_DIR = join(configDir, 'vtex', 'telemetry')
  private static telemetryCollectorSingleton: TelemetryCollector

  public static getCollector() {
    if (!TelemetryCollector.telemetryCollectorSingleton) {
      const store = new TelemetryLocalStore(`${pkgJson.name}-telemetry-store`)
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
    if (error instanceof ErrorReport) {
      this.errors.push(error)
      return error
    }

    const errorReport = ErrorReport.create({ originalError: error })
    this.errors.push(errorReport)
    return errorReport
  }

  public registerMetric(metric: Metric): MetricReport {
    const metricReport = metricToMetricReport(metric)
    this.metrics.push(metricReport)
    return metricReport
  }

  public async flush(forceRemoteFlush = true) {
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

    const obj = {
      errors: this.errors.map(err => err.toObject()),
      metrics: this.metrics,
    }
    console.log('Telemetry object: \n', obj)
    const objFilePath = join(TelemetryCollector.TELEMETRY_LOCAL_DIR, `${randomBytes(8).toString('hex')}.json`)
    try {
      await ensureFile(objFilePath)
      await writeJson(objFilePath, obj) // Telemetry object should be saved in a file since it can be too large to be passed as a cli argument
      const cp = spawn(process.execPath, [join(__dirname, 'TelemetryReporter.js'), this.store.storeName, objFilePath], {
        // detached: true,
        // stdio: 'ignore',
      }) // .unref()
      cp.stderr.pipe(process.stderr)
      cp.stdout.pipe(process.stdout)
    } catch (e) {
      logger.error('Error writing telemetry file. Error: ', e)
    }
  }
}
