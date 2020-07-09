import streamToString from 'get-stream'
import net from 'net'
import WebSocket from 'ws'
import { cluster } from '../../api/env'
import { Headers } from '../../lib/constants/Headers'
import { ManifestEditor } from '../../api/manifest'
import { SessionManager } from '../../api/session/SessionManager'
import { versionMajor } from '../../api/locator'
import log from '../../api/logger'
import userAgent from '../../user-agent'

const keepAliveDelayMs = 3 * 60 * 1000
const THIRTY_SECONDS_MS = 30 * 1000

const wsCloseCodeGoingAway = 1001
const wsCloseCodeError = 1011
const DEFAULT_DEBUGGER_PORT = 9229
const MAX_RETRY_COUNT = 40

function getErrorMessage(raw: string): string {
  try {
    const errJson = JSON.parse(raw)
    return errJson.message || errJson.code || raw
  } catch (err) {
    return raw
  }
}

function webSocketTunnelHandler(host: string, path: string, server: net.Server): (socket: net.Socket) => void {
  return (socket: net.Socket) => {
    socket.setKeepAlive(true, keepAliveDelayMs)
    const ws = new WebSocket(`wss://${host}${path}`, {
      headers: {
        Authorization: SessionManager.getSingleton().checkAndGetToken(true),
        Host: host,
        'user-agent': userAgent,
        [Headers.VTEX_RUNTIME_API]: 'true',
        ...(cluster() ? { [Headers.VTEX_UPSTREAM_TARGET]: cluster() } : null),
      },
    })

    const interval = setInterval(ws.ping, THIRTY_SECONDS_MS)

    const end = () => {
      clearInterval(interval)
      ws.removeAllListeners()
      socket.removeAllListeners()
      socket.destroy()
    }

    ws.on('close', end)

    ws.on('error', err => {
      end()
      log.error(`Debugger websocket error: ${err.name}: ${err.message}`)
    })

    ws.on('unexpected-response', async (_, res) => {
      end()
      const errMsg = getErrorMessage(await streamToString(res))
      log.warn(`Unexpected response from debugger hook (${res.statusCode}): ${errMsg}`)

      if (res.statusCode === 401 || res.statusCode === 403) {
        log.warn(`Got unauthorized error from remote debugger, finalizing local debugger...`)
        server.close()
      }
    })

    ws.on('message', data => {
      try {
        socket.write(data)
      } catch (err) {
        end()
        ws.close(wsCloseCodeError)
      }
    })

    ws.on('open', () => {
      socket.on('data', data => {
        if (ws.readyState !== ws.OPEN) {
          log.debug(`Tried to write to debugger websocket but it is not opened`)
          return
        }
        ws.send(data, err => {
          if (err) {
            log.error(`Error writing to debugger websocket: ${err.name}: ${err.message}`)
          }
        })
      })

      socket.on('close', hadError => {
        end()
        ws.close(hadError ? wsCloseCodeError : wsCloseCodeGoingAway)
      })
    })
  }
}

export default function startDebuggerTunnel(
  manifest: ManifestEditor,
  port: number = DEFAULT_DEBUGGER_PORT
): Promise<number | void> {
  const { name, vendor, version, builders } = manifest
  const { node, 'service-js': serviceJs } = builders
  if (!node && !serviceJs) {
    return
  }

  const { account, workspace } = SessionManager.getSingleton()
  const appMajor = versionMajor(version)
  const host = 'app.io.vtex.com'
  const path = `/${vendor}.${name}/v${appMajor}/${account}/${workspace}/_debug/attach`

  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('connection', webSocketTunnelHandler(host, path, server))

    server.on('error', err => {
      if (port < DEFAULT_DEBUGGER_PORT + MAX_RETRY_COUNT) {
        log.warn(`Port ${port} in use, will try to open tunnel on port ${port + 1}`)
        resolve(startDebuggerTunnel(manifest, port + 1))
      } else {
        reject(err)
      }
    })

    server.listen(port, () => {
      const addr = server.address() as net.AddressInfo
      resolve(addr.port)
    })
  })
}
