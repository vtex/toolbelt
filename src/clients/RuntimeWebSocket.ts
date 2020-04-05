import { randomBytes } from 'crypto'
import getStream from 'get-stream'
import { Duplex } from 'stream'
import url from 'url'
import WebSocket from 'ws'
import { cluster, region } from '../env'
import { ErrorKinds } from '../lib/error/ErrorKinds'
import { SessionManager } from '../lib/session/SessionManager'
import { TelemetryCollector } from '../lib/telemetry/TelemetryCollector'
import { timedPromise } from '../lib/utils/timedPromise'

export interface RuntimeWebSocketCreateContext {
  appName: string
  appVendor: string
}

export interface RuntimeWebSocketContext {
  account: string
  workspace: string
  token: string
  region: string
  appName: string
  appVendor: string
  appMajorLocator: string
}

export interface RuntimeWebSocketOptions {
  webSocketPingInterval?: number
  createStreamInterface?: boolean
  streamEncoding?: string
  url: {
    suffix: string
    query?: Record<string, any>
  }
}

export class RuntimeWebSocket {
  private static readonly WEB_SOCKET_PING_INTERVAL = 10 * 1000
  private static readonly WEB_SOCKET_CLOSE_TIMEOUT = 1 * 1000
  private static readonly WEB_SOCKET_OK_CLOSE_CODE = 1000

  public static create(appName: string, appVendor: string, appMajorLocator: string, options: RuntimeWebSocketOptions) {
    const { account, workspace, token } = SessionManager.getSessionManager()
    return new RuntimeWebSocket(
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

  public wsId: string
  private wsUrl: string
  private wsClientOptions: WebSocket.ClientOptions

  public ws?: WebSocket
  public wsDuplexStream?: Duplex

  private shouldCreateStreamInterface: boolean
  private streamEncoding: string

  private hearbeatCheckInterval: number
  private nextHeartbeatCheck: NodeJS.Timeout
  private gotHeartbeat: boolean

  constructor(context: RuntimeWebSocketContext, options: RuntimeWebSocketOptions) {
    const { account, workspace, region, token, appVendor, appName, appMajorLocator } = context
    const {
      createStreamInterface = false,
      streamEncoding,
      url: { suffix, query: requiredQuery },
    } = options

    this.shouldCreateStreamInterface = createStreamInterface
    this.streamEncoding = streamEncoding
    this.hearbeatCheckInterval = options.webSocketPingInterval ?? RuntimeWebSocket.WEB_SOCKET_PING_INTERVAL

    this.wsClientOptions = {
      headers: {
        Authorization: token,
        'x-vtex-runtime-api': 'true',
        ...(cluster() ? { 'x-vtex-upstream-target': cluster() } : null),
      },
    }

    this.wsId = randomBytes(8).toString('hex')
    this.wsUrl = url.format({
      protocol: 'ws',
      hostname: `${appName}.${appVendor}.${region}.vtex.io`,
      pathname: `/${account}/${workspace}/${suffix}`,
      query: {
        __v: appMajorLocator,
        ...requiredQuery,
      },
    })
  }

  public connect() {
    this.ws = new WebSocket(this.wsUrl, this.wsClientOptions)

    this.ws.on('close', (code, reason) => {
      if (code === RuntimeWebSocket.WEB_SOCKET_OK_CLOSE_CODE) return
      const errMessage = `WebSocket closed with error code: ${code}${reason ? ` ${reason}` : ''}`
      this.registerError(new Error(errMessage)).logErrorForUser()
    })

    this.setupHeartbeat()

    if (this.shouldCreateStreamInterface) {
      if (!this.streamEncoding) {
        this.wsDuplexStream = (WebSocket as any).createWebSocketStream(this.ws)
      } else {
        this.wsDuplexStream = (WebSocket as any).createWebSocketStream(this.ws, { encoding: this.streamEncoding })
      }
    }

    this.setupErrorHandling()

    const startupPromise = new Promise((resolve, reject) => {
      this.ws.once('error', reject)
      this.ws.once('close', reject)
      this.ws.once('open', () => {
        this.ws.removeListener('error', reject)
        this.ws.removeListener('close', reject)
        resolve()
      })
    })

    return startupPromise
  }

  public async close() {
    clearTimeout(this.nextHeartbeatCheck)

    if (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
      return Promise.resolve()
    }

    this.wsDuplexStream?.unpipe()

    const closePromise = new Promise(resolve => {
      this.ws.close()
      this.ws.once('close', resolve)
    })

    const timedClosePromise = timedPromise(
      closePromise,
      RuntimeWebSocket.WEB_SOCKET_CLOSE_TIMEOUT,
      this.createCloseTimeoutError
    )

    try {
      await timedClosePromise
    } catch (err) {
      this.ws.terminate()
      this.registerError(err)
    }
  }

  public writeMessageToWS(msg: Buffer) {
    if (this.ws.readyState !== this.ws.OPEN) {
      const err = new Error(`Tried to write to debugger websocket but it is not opened`)
      throw this.registerError(err)
    }

    this.ws.send(msg, err => {
      if (!err) return
      this.registerError(err)
    })
  }

  private setupHeartbeat() {
    this.gotHeartbeat = false
    this.ws.once('open', () => (this.gotHeartbeat = true))
    this.ws.on('pong', () => (this.gotHeartbeat = true))
    this.ws.once('close', () => clearTimeout(this.nextHeartbeatCheck))
    this.nextHeartbeatCheck = setTimeout(this.hearbeatCheck, this.hearbeatCheckInterval)
  }

  private hearbeatCheck = () => {
    if (!this.gotHeartbeat) {
      return this.ws.close()
    }

    this.gotHeartbeat = false
    this.ws.ping()
    this.nextHeartbeatCheck = setTimeout(this.hearbeatCheck, this.hearbeatCheckInterval)
  }

  private setupErrorHandling() {
    this.ws.on('unexpected-response', async (_, res) => {
      const errMsg = await getStream(res)
      this.registerError(new Error(`Unexpected response from debugger hook (${res.statusCode}): ${errMsg}`))
      this.ws.close()
    })

    this.ws.on('error', this.registerError)
    this.wsDuplexStream?.on('error', this.registerError)
  }

  private createCloseTimeoutError = (timePast: number) => {
    return new Error(`RuntimeWebSocket close operation timed out after ${timePast}`)
  }

  private registerError(err: any, userFriendlyMessage?: string) {
    return TelemetryCollector.createAndRegisterErrorReport({
      kind: ErrorKinds.RUNTIME_WEB_SOCKET_ERROR,
      userMessage: userFriendlyMessage,
      originalError: err,
    })
  }
}
