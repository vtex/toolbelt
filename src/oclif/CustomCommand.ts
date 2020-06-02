import { hrTimeToMs } from '../lib/utils/hrTimeToMs'
import { Metric } from '../lib/metrics/MetricReport'
import { onError } from './hooks/init'
import { ParsingToken } from '@oclif/parser/lib/parse'
import { TelemetryCollector } from '../lib/telemetry/TelemetryCollector'
import { TraceConfig } from '../lib/globalConfigs/traceConfig';
import * as Parser from '@oclif/parser';
import OclifCommand, { flags as oclifFlags } from '@oclif/command'

export abstract class CustomCommand extends OclifCommand {
  public static globalFlags = {
    verbose: oclifFlags.boolean({ char: 'v', description: 'Show debug level logs', default: false }),
    help: oclifFlags.help({ char: 'h' }),
    trace: oclifFlags.boolean({ char: 't', description: 'Log tracing to jaeger', default: false }),
  }

  getAllArgs(rawParse: ParsingToken[]) {
    return rawParse.filter(token => token.type === 'arg').map(token => token.input)
  }

  protected parse<F, A extends {
    [name: string]: any;
  }>(options?: Parser.Input<F>, argv?: string[]): Parser.Output<F, A> {
    const result = super.parse<F, A>(options, argv)
    TraceConfig.checkTrace((result.flags as any).trace)
    return result
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
      if (err && err.oclif === undefined) await onError(err)
      const { config } = require('@oclif/errors')
      if (config.errorLogger) await config.errorLogger.flush()
    } catch (error) {
      console.error(error)
    }
  }
}
