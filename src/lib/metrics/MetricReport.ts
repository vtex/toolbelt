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

export interface MetricReport extends Metric {
  env: MetricEnv
}

export function metricToMetricReport(metric: Metric): MetricReport {
  const { workspace, account } = SessionManager.getSessionManager()
  return {
    ...metric,
    env: {
      account,
      workspace,
      toolbeltVersion: pkg.version,
      nodeVersion: process.version,
      platform: process.platform,
    },
  }
}
