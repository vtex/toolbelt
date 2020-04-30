import { IOContext } from '@vtex/api'
import { cluster } from '../env'
import * as url from 'url'
import WebSocket from 'ws'
import logger from '../logger'
import { SessionManager } from '../lib/session/SessionManager'

const EOT = '\x04'

export class Runtime {
  private account: string
  private workspace: string

  constructor(context: IOContext) {
    const { account, workspace } = context
    this.account = account
    this.workspace = workspace
  }

  public async debugDotnetApp(appName: string, appVendor: string, appMajor: string, debugInst: string) {
    const host = 'app.io.vtex.com'
    const path = `/${appVendor}.${appName}/v${appMajor}/${this.account}/${this.workspace}/_debug/dotnet`
    const clusterHeader = cluster() ? { 'x-vtex-upstream-target': cluster() } : null

    const clientOptions = {
      headers: {
        Authorization: SessionManager.getSingleton().token,
        Host: host,
        'X-Vtex-Runtime-Api': 'true',
        ...clusterHeader,
      },
    }

    const urlObject = {
      protocol: 'wss',
      hostname: host,
      pathname: path,
      query: {
        inst: debugInst.split(' '),
      },
    }
    const formattedUrl = url.format(urlObject)

    const ws = new WebSocket(formattedUrl, clientOptions)
    const wsDuplexStream = (WebSocket as any).createWebSocketStream(ws, { encoding: 'utf8' })

    wsDuplexStream.on('error', () => {
      logger.debug('Connection closed')
      process.exit(0)
    })

    wsDuplexStream.pipe(process.stdout)

    process.stdin.pipe(wsDuplexStream, { end: false })
    process.stdin.on('end', () => {
      wsDuplexStream.end(EOT)
    })
  }
}
