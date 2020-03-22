import { AppClient, IOContext, InstanceOptions } from '@vtex/api'
import getStream from 'get-stream'
import archiver from 'archiver'
import { ZlibOptions } from 'zlib'

export class TelemetryClient extends AppClient {
  private static readonly OBJECT_SIZE_LIMIT = 100000 // 1Kb

  private compressDataOnMemory = async (errorOrMetric: string, zlibOptions: ZlibOptions = {}) => {
    const zip = archiver('zip', { zlib: zlibOptions })

    zip.on('error', (err: any) => {
      throw err
    })
    zip.append(errorOrMetric, { name: 'TelemetryData' })

    const [zipContent] = await Promise.all([getStream.buffer(zip), zip.finalize()])
    return zipContent as Buffer
  }

  private async maybeCompressData(dataToCompress: any[]) {
    const stringfiedDataToCompress = JSON.stringify(dataToCompress)
    const bytesSize = stringfiedDataToCompress.length
    if (bytesSize > TelemetryClient.OBJECT_SIZE_LIMIT) {
      const compressedObject = await this.compressDataOnMemory(stringfiedDataToCompress)
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
