import { AppClient, IOContext, InstanceOptions } from '@vtex/api'

export class TelemetryClient extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public async reportErrors(errors: any[]) {
    let bufferFromErrors = Buffer.from(JSON.stringify(errors))
    let errorsInBase64 = bufferFromErrors.toString('base64')
    return this.http.post('/errorReport', errorsInBase64)
  }
}
