import { IOContext } from '@vtex/api'
import { cluster } from '../env'
import * as url from 'url'
import WebSocket from 'ws'
import { getToken } from '../conf'
import logger from '../logger'

const EOT = '\x04'

export class Runtime {
  private region: string

  private account: string

  private workspace: string

  constructor(context: IOContext) {
    const { region, account, workspace } = context
    this.region = region
    this.account = account
    this.workspace = workspace
  }

  public async debugDotnetApp(appName: string, appVendor: string, appMajorRange: string, debugInst: string) {
    const host = `${appName}.${appVendor}.${this.region}.vtex.io`
    const path = `/${this.account}/${this.workspace}/_debug/dotnet`
    const clusterHeader = cluster() ? { 'x-vtex-upstream-target': cluster() } : null

    const clientOptions = {
      headers: {
        Authorization: getToken(),
        Host: host,
        'X-Vtex-Runtime-Api': 'true',
        ...clusterHeader,
      },
    }

    const urlObject = {
      protocol: 'ws',
      hostname: host,
      pathname: path,
      query: {
        __v: appMajorRange,
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
