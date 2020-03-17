import { SessionManager } from "../session/SessionManager"
import * as pkg from '../../../package.json'

export interface Metric {
  [metricName: string]: number | string | MetricEnv
}

interface MetricEnv {
  command: string
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
      command: process.argv.slice(2).join(' '),
      account,
      workspace,
      toolbeltVersion: pkg.version,
      nodeVersion: process.version,
      platform: process.platform,
    },
  }
}