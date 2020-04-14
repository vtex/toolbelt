import OclifCommand from '@oclif/command'
import { ParsingToken } from '@oclif/parser/lib/parse'

import { hrTimeToMs } from '../lib/utils/hrTimeToMs'
import { TelemetryCollector } from '../lib/telemetry/TelemetryCollector'
import { Metric } from '../lib/metrics/MetricReport'
import { onError } from './hooks/init'

export abstract class CustomCommand extends OclifCommand {
  getAllArgs(rawParse: ParsingToken[]) {
    return rawParse.filter(token => token.type === 'arg').map(token => token.input)
  }

  async _run<T>(): Promise<T | undefined> {
    let err: Error | undefined

    try {
      // remove redirected env var to allow subsessions to run autoupdated client
      delete process.env[this.config.scopedEnvVarKey('REDIRECTED')]
      await this.init()
      const commandStartTime = process.hrtime()
      const result = await this.run()
      const commandLatency = process.hrtime(commandStartTime)
      const commandLatencyMetric: Metric = {
        command: this.id,
        latency: hrTimeToMs(commandLatency),
      }
      TelemetryCollector.getCollector().registerMetric(commandLatencyMetric)
      return result
    } catch (error) {
      err = error
      await this.catch(error)
    } finally {
      await this.finally(err)
    }
  }

  async finally(err: any): Promise<any> {
    try {
      if (err.oclif === undefined) await onError(err)
      const config = require('@oclif/errors').config
      if (config.errorLogger) await config.errorLogger.flush()
      // tslint:disable-next-line no-console
    } catch (error) {
      console.error(error)
    }
  }
}
