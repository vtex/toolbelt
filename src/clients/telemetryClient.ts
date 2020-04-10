import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

import { ErrorReport } from '../utils/error/ErrorReport'
import { MetricReport } from '../utils/metrics/MetricReport'

export class TelemetryClient extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public reportErrors(errors: ErrorReport[]) {
    const errorsBuffer = Buffer.from(JSON.stringify(errors))
    return this.http.post('/errorReport', errorsBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  public reportMetrics(metrics: MetricReport[]) {
    return this.http.post('/metricsRegister', metrics)
  }
}
