import Configstore from 'configstore'
import { isArray } from 'util'

import { ErrorReport } from '../error/ErrorReport'
import { MetricReport } from '../metrics/MetricReport'

export interface ITelemetryLocalStore {
  storeName: string
  getErrors: () => ErrorReport[]
  getMetrics: () => MetricReport[]
  getLastRemoteFlush: () => any
  setLastRemoteFlush: (date: number) => void
  setErrors: (errors: ErrorReport[]) => void
  setMetrics: (metrics: MetricReport[]) => void
  clear: () => void
}

export class TelemetryLocalStore implements ITelemetryLocalStore {
  public readonly storeName: string
  private store: Configstore
  constructor(storeName: string) {
    this.storeName = storeName
    this.store = new Configstore(storeName)
  }

  public getErrors() {
    return this.store.get('errors') || []
  }

  public getMetrics() {
    const metrics = this.store.get('metrics')
    if (!isArray(metrics)) {
      return []
    }
    return metrics.map(metric => MetricReport.create(metric.metric, metric.env))
  }

  public getLastRemoteFlush() {
    return this.store.get('lastRemoteFlush') ?? 0
  }

  public setErrors(errors: ErrorReport[]) {
    this.store.set('errors', errors)
  }

  public setMetrics(metrics: MetricReport[]) {
    this.store.set('metrics', metrics)
  }

  public setLastRemoteFlush(date: number) {
    this.store.set('lastRemoteFlush', date)
  }

  public clear() {
    this.store.clear()
  }
}
