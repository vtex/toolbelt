import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

import { MetricReport } from '../lib/metrics/MetricReport'

export class TelemetryClient extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public reportErrors(errors: any[]) {
    const errorsBuffer = Buffer.from(JSON.stringify(errors))
    return this.http.post('/errorReport', errorsBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  public reportMetrics(metrics: MetricReport[]) {
    console.log('Metrics send to toolbelt-telemetry', metrics)
  }
}
