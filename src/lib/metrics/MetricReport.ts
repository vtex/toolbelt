import { SessionManager } from '../session/SessionManager'
import * as pkg from '../../../package.json'

export interface Metric {
  command: string
  [metricName: string]: number | string | MetricEnv
}

interface MetricEnv {
  account: string
  workspace: string
  toolbeltVersion: string
  nodeVersion: string
  platform: string
}

interface MetricReportArguments {
  metric: Metric,
  env: MetricEnv
}

export class MetricReport {
  public readonly metric: Metric
  public readonly env: MetricEnv

  constructor({ metric, env }: MetricReportArguments) {
    this.metric = metric
    this.env = env
  }

  public static create(metric: Metric) {
    const { workspace, account } = SessionManager.getSessionManager()
    return new MetricReport({
      metric,
      env: {
        account,
        workspace,
        toolbeltVersion: pkg.version,
        nodeVersion: process.version,
        platform: process.platform,
      },
    })
  }

  public toObject() {
    return {
      ...this.metric,
      env: this.env
    }
  }
}