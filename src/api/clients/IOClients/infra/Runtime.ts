import { IOContext } from '@vtex/api'
import * as url from 'url'
import WebSocket from 'ws'
import logger from '../../../logger'
import { Headers } from '../../../constants/Headers'
import { SessionManager } from '../../../session/SessionManager'
import { IOClientFactory } from '../IOClientFactory'

const EOT = '\x04'

export class Runtime {
  public static createClient() {
    return new Runtime(IOClientFactory.createIOContext())
  }

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

    const clientOptions = {
      headers: {
        Authorization: SessionManager.getSingleton().token,
        Host: host,
        [Headers.VTEX_RUNTIME_API]: 'true',
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
