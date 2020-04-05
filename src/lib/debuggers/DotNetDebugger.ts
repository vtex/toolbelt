import { RuntimeWebSocket } from '../../clients/RuntimeWebSocket'
import logger from '../../logger'
import { ManifestEditor } from '../manifest'

interface DotNetDebuggerContext {
  appName: string
  appVendor: string
  appMajorLocator: string
  debugInst: string
}

export class DotNetDebugger {
  private static readonly END_OF_TRANSMISSION_CODE = '\x04'

  public static create(manifest: ManifestEditor, debugInst: string) {
    return new DotNetDebugger({
      debugInst,
      appName: manifest.name,
      appVendor: manifest.vendor,
      appMajorLocator: manifest.majorRange,
    })
  }

  private runtimeWS: RuntimeWebSocket

  constructor(context: DotNetDebuggerContext) {
    const { appName, appVendor, appMajorLocator } = context
    this.runtimeWS = RuntimeWebSocket.create(appName, appVendor, appMajorLocator, {
      streamEncoding: 'utf-8',
      url: {
        suffix: '/_debug/dotnet',
        query: {
          inst: context.debugInst.split(' '),
        },
      },
    })
  }

  public async start() {
    await this.runtimeWS.connect()
    this.runtimeWS.wsDuplexStream.on('error', async () => {
      logger.debug('Connection closed')
      process.exit()
    })

    this.runtimeWS.wsDuplexStream.pipe(process.stdout)

    process.stdin.pipe(this.runtimeWS.wsDuplexStream, { end: false })
    process.stdin.on('end', () => {
      this.runtimeWS.wsDuplexStream.end(DotNetDebugger.END_OF_TRANSMISSION_CODE)
    })
  }
}
