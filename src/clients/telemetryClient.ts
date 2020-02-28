import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

export class TelemetryClient extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public reportErrors(errors: any[]) {
    return this.http.post('/errorReport', errors)
  }
}
