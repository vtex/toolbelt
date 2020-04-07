import * as pkg from '../../../package.json'
import { SessionManager } from '../session/SessionManager'
import { getPlatform } from '../utils/getPlatform'

export interface Metric {
  command: string
  [metricName: string]: number | string
}

interface MetricEnv {
  account: string
  workspace: string
  toolbeltVersion: string
  nodeVersion: string
  platform: string
}

interface MetricReportArguments {
  metric: Metric
  env: MetricEnv
}

export class MetricReport {
  public static create(metric: Metric, env?: MetricEnv) {
    if (env) {
      return new MetricReport({ metric, env })
    }
    const { workspace, account } = SessionManager.getSessionManager()
    return new MetricReport({
      metric,
      env: {
        account,
        workspace,
        toolbeltVersion: pkg.version,
        nodeVersion: process.version,
        platform: getPlatform(),
      },
    })
  }

  constructor({ metric, env }: MetricReportArguments) {
    this.metric = metric
    this.env = env
  }

  public readonly metric: Metric
  public readonly env: MetricEnv

  public toObject() {
    return {
      metric: this.metric,
      env: this.env,
    }
  }
}
