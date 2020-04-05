import chalk from 'chalk'
import logger from '../../logger'
import { ErrorReport } from '../error/ErrorReport'
import { ManifestEditor } from '../manifest'
import { TcpRuntimeWebSocketProxy } from './proxy/TcpRuntimeWebSocketProxy'

interface NodeDebuggerContext {
  appName: string
  appVendor: string
  appMajorLocator: string
}

interface NodeDebuggerOptions {
  localServerDefaultPort: number
}

export class NodeDebugger {
  private static readonly LOCAL_SERVER_DEFAULT_PORT = 9229

  public static create(manifest: ManifestEditor) {
    return new NodeDebugger(
      {
        appName: manifest.name,
        appVendor: manifest.vendor,
        appMajorLocator: manifest.majorRange,
      },
      { localServerDefaultPort: NodeDebugger.LOCAL_SERVER_DEFAULT_PORT }
    )
  }

  private proxy: TcpRuntimeWebSocketProxy
  private started: boolean

  constructor(private ctx: NodeDebuggerContext, private options: NodeDebuggerOptions) {
    this.started = false
  }

  public startIfNotStarted() {
    if (this.started) {
      return
    }

    this.started = true
    return this.start()
  }

  public async start() {
    this.proxy = TcpRuntimeWebSocketProxy.create(this.ctx.appName, this.ctx.appVendor, this.ctx.appMajorLocator, {
      localServerDefaultPort: this.options.localServerDefaultPort,
      url: { suffix: '_debug/attach' },
    })

    try {
      await this.proxy.startServer()
      logger.info(
        `Debugger tunnel listening on ${chalk.green(`localhost:${this.proxy.localServerPort}`)}. Go to ${chalk.blue(
          'chrome://inspect'
        )} in Google Chrome to debug your running application.`
      )
    } catch (err) {
      logger.error(`Failed to start local debugger server`)
      ;(err as ErrorReport).logErrorForUser({ coreLogLevelDefault: 'debug' })
    }
  }
}
