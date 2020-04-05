import getPort from 'get-port'
import net from 'net'
import { RuntimeWebSocket, RuntimeWebSocketContext } from '../../../clients/RuntimeWebSocket'
import { region } from '../../../env'
import { ErrorKinds } from '../../error/ErrorKinds'
import { SessionManager } from '../../session/SessionManager'
import { TelemetryCollector } from '../../telemetry/TelemetryCollector'

export interface TcpRuntimeWebSocketProxyOptions {
  localServerDefaultPort: number
  underlyingWebSocketPingInterval?: number
  url: {
    suffix: string
    query?: Record<string, any>
  }
}

export class TcpRuntimeWebSocketProxy {
  public static create(
    appName: string,
    appVendor: string,
    appMajorLocator: string,
    options: TcpRuntimeWebSocketProxyOptions
  ) {
    const { account, workspace, token } = SessionManager.getSessionManager()
    return new TcpRuntimeWebSocketProxy(
      {
        account,
        workspace,
        token,
        appName,
        appVendor,
        appMajorLocator,
        region: region(),
      },
      options
    )
  }

  public localServerPort: number
  private tcpProxy: net.Server

  constructor(private runtimeCtx: RuntimeWebSocketContext, private options: TcpRuntimeWebSocketProxyOptions) {
    this.localServerPort = options.localServerDefaultPort
  }

  public async startServer() {
    const preferredPorts = Array.from({ length: 20 }, (_, index) => this.localServerPort + index)
    this.localServerPort = await getPort({ port: preferredPorts })
    this.tcpProxy = net.createServer(this.serverConnectionHandler)
    await this.promisifiedServerStart()
  }

  private promisifiedServerStart() {
    return new Promise((resolve, reject) => {
      this.tcpProxy.once('error', reject)

      this.tcpProxy.once('listening', () => {
        resolve()
        this.tcpProxy.removeListener('error', reject)
      })

      this.tcpProxy.listen(this.localServerPort)
    })
  }

  private serverConnectionHandler = async (incomingSocket: net.Socket) => {
    const runtimeWS = new RuntimeWebSocket(this.runtimeCtx, {
      webSocketPingInterval: this.options.underlyingWebSocketPingInterval,
      url: this.options.url,
    })

    const finishSocket = () => {
      incomingSocket.removeAllListeners()
      incomingSocket.destroy()
    }

    try {
      await runtimeWS.connect()
    } catch (err) {
      finishSocket()
      return
    }

    incomingSocket.on('error', err => {
      this.registerError(err, 'TCPProxy socket error.')
    })

    incomingSocket.on('close', () => {
      finishSocket()
      runtimeWS.close()
    })

    runtimeWS.ws.on('close', finishSocket)

    runtimeWS.ws.on('error', err => {
      this.registerError(err, `Debugger websocket error: ${err.name}: ${err.message}`)
      finishSocket()
    })

    runtimeWS.ws.on('message', data => {
      incomingSocket.write(data)
    })

    incomingSocket.on('data', data => {
      try {
        runtimeWS.writeMessageToWS(data)
      } catch (err) {
        finishSocket()
        runtimeWS.close()
      }
    })
  }

  private registerError(err: any, userFriendlyMessage?: string) {
    return TelemetryCollector.createAndRegisterErrorReport({
      kind: ErrorKinds.RUNTIME_WEB_SOCKET_TCP_PROXY_SERVER_ERROR,
      userMessage: userFriendlyMessage,
      originalError: err,
    })
  }
}
