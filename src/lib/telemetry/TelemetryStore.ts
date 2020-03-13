import Configstore from 'configstore'
import { ErrorReport } from '../error/ErrorReport'

export interface ITelemetryLocalStore {
  storeName: string
  getErrors: () => ErrorReport[]
  getMetrics: () => any
  getLastRemoteFlush: () => any
  setLastRemoteFlush: (date: number) => void
  setErrors: (errors: ErrorReport[]) => void
  setMetrics: (metrics: any) => void
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
    return this.store.get('metrics') || {}
  }

  public getLastRemoteFlush() {
    return this.store.get('lastRemoteFlush') ?? 0
  }

  public setErrors(errors: ErrorReport[]) {
    this.store.set('errors', errors)
  }

  public setMetrics(metrics: any) {
    this.store.set('metrics', metrics)
  }

  public setLastRemoteFlush(date: number) {
    this.store.set('lastRemoteFlush', date)
  }

  public clear() {
    this.store.clear()
  }
}
