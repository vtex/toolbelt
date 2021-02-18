import { AppClient, InstanceOptions, IOContext } from '@vtex/api'
import { ErrorReportSerializableObj } from '@vtex/node-error-report'
import { MetricReportObj } from '../../../metrics/MetricReport'
import { IOClientFactory } from '../IOClientFactory'

export class ToolbeltTelemetry extends AppClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<ToolbeltTelemetry>(ToolbeltTelemetry, customContext, customOptions)
  }

  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public reportErrors(errors: ErrorReportSerializableObj[]) {
    const errorsBuffer = Buffer.from(JSON.stringify(errors))
    return this.http.post('/errorReport', errorsBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  public reportMetrics(metrics: MetricReportObj[]) {
    return this.http.post('/metricsRegister', metrics)
  }
}
