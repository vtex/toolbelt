import * as WebSocket from 'ws'
import * as net from 'net'
import * as streamToString from 'get-stream'

import log from '../../logger'
import {getAccount, getWorkspace, getToken} from '../../conf'
import {toMajorRange} from '../../locator'
import {region} from '../../env'

const keepAliveDelayMs = 3 * 60 * 1000

const wsCloseCodeGoingAway = 1001
const wsCloseCodeError = 1011

function getErrorMessage (raw: string): string {
  try {
    const errJson = JSON.parse(raw)
    return errJson.message || errJson.code || raw
  } catch (err) {
    return raw
  }
}

function webSocketTunnelHandler (endpoint: string, server: net.Server): (socket: net.Socket) => void {
  const options = {
    headers: {
      Authorization: 'Bearer ' + getToken(),
    },
  }

  return function (socket: net.Socket) {
    socket.setKeepAlive(true, keepAliveDelayMs)
    const ws = new WebSocket(endpoint, options)

    const end = () => {
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
      if (errMsg === 'Unable to connect to the remote server') {
        log.error('Unable to connect to remote debugger. Make sure you are running on colossus-js version >=0.2.0.')
        server.close()
        log.error('Local debugger tunnel closed.')
      } else {
        log.error(`Unexpected response from debugger hook (${res.statusCode}): ${errMsg}`)
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
        ws.send(data, err => {
          if (err && err.message !== 'not opened') {
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

export default function startDebuggerTunnel (manifest: Manifest, port: number = 5858): Promise<number> {
  const {name, vendor, version} = manifest
  const majorRange = toMajorRange(version)
  const endpoint = `ws://${name}.${vendor}.${region}.vtex.io/${getAccount()}/${getWorkspace()}/_debug/attach?__v=${majorRange}`

  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('connection', webSocketTunnelHandler(endpoint, server))

    server.on('error', err => {
      if (port < 5900) {
        log.warn(`Port ${port} in use, will try to open tunnel on port ${port + 1}`)
        resolve(startDebuggerTunnel(manifest, port + 1))
      } else {
        reject(err)
      }
    })

    server.listen(port, () => {
      resolve(server.address().port)
    })
  })
}
