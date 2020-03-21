import { AppClient, InstanceOptions, IOContext } from '@vtex/api'
import getStream from 'get-stream'
import archiver from 'archiver'
import { ZlibOptions } from 'zlib'

export class TelemetryClient extends AppClient {
  private static readonly OBJECT_SIZE_LIMIT = 100000 //1Kb

  private compressDataOnMemory = async (errorOrMetricArray: any[], zlibOptions: ZlibOptions = {}) => {
    const zip = archiver('zip', { zlib: zlibOptions })

    zip.on('error', (err: any) => {
      throw err
    })
    zip.append(errorOrMetricArray.toString(), { name: 'TelemetryData' })

    const [zipContent] = await Promise.all([getStream.buffer(zip), zip.finalize()])
    return zipContent as Buffer
  }

  private async maybeCompressData(dataToCompress: any[]) {
    const dataToCompressAsString = dataToCompress.toString()
    const bytesSize = Buffer.byteLength(dataToCompressAsString)
    if (bytesSize > TelemetryClient.OBJECT_SIZE_LIMIT) {
      const compressedObject = await this.compressDataOnMemory(dataToCompress)
      return compressedObject
    }
    return dataToCompress
  }

  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.toolbelt-telemetry@0.x', ioContext, opts)
  }

  public async reportErrors(errors: any[]) {
    const maybeCompressedErrors = await this.maybeCompressData(errors)

    return this.http.post('/errorReport', maybeCompressedErrors)
  }
}
