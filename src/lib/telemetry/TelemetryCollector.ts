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

  public registerError(error: ErrorReport | Error | any) {
    if (error instanceof ErrorReport) {
      return this.errors.push(error)
    }

    const code = ErrorReport.createGenericCode(error)
    return this.errors.push(
      ErrorReport.create({
        code,
        message: error.message,
        originalError: error,
        tryToParseError: true,
      })
    )
  }

  public registerMetric() {}

  public flush(forceRemoteFlush = false) {
    const shouldForceRemoteFlush = forceRemoteFlush || this.errors.length > 0

    if (shouldForceRemoteFlush) {
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
    } else {
      this.store.setErrors(this.errors)
      this.store.setMetrics(this.metrics)
    }
  }
}
