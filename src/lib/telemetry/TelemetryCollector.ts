import { spawn } from 'child_process'
import { join } from 'path'
import * as pkgJson from '../../../package.json'
import { ErrorReport } from '../error/ErrorReport'
import { ITelemetryLocalStore, TelemetryLocalStore } from './TelemetryStore'

export class TelemetryCollector {
  private static telemetryCollectorSingleton: TelemetryCollector

  public static getCollector() {
    if (!TelemetryCollector.telemetryCollectorSingleton) {
      const store = new TelemetryLocalStore(`${pkgJson.name}-telemetry-store`)
      TelemetryCollector.telemetryCollectorSingleton = new TelemetryCollector(store)
    }

    return TelemetryCollector.telemetryCollectorSingleton
  }

  private errors: ErrorReport[]
  private metrics: any
  constructor(private store: ITelemetryLocalStore) {
    this.errors = this.store.getErrors()
    this.metrics = this.store.getMetrics()
  }

  public registerError(error: ErrorReport | Error | any): ErrorReport {
    if (error instanceof ErrorReport) {
      this.errors.push(error)
      return error
    }

    const code = ErrorReport.createGenericCode(error)
    const errorReport = ErrorReport.create({
      code,
      message: error.message,
      originalError: error,
      tryToParseError: true,
    })

    this.errors.push(errorReport)
    return errorReport
  }

  public registerMetric() {}

  public flush(forceRemoteFlush = false) {
    const shouldRemoteFlush = forceRemoteFlush || this.errors.length > 0
    if (!shouldRemoteFlush) {
      this.store.setErrors(this.errors)
      this.store.setMetrics(this.metrics)
      return
    }

    this.store.setErrors([])
    this.store.setMetrics({})

    const obj = {
      errors: this.errors.map(err => err.toObject()),
      metrics: this.metrics,
    }

    spawn(process.execPath, [join(__dirname, 'TelemetryReporter.js'), this.store.storeName, JSON.stringify(obj)], {
      detached: true,
      stdio: 'ignore',
    }).unref()
  }
}
