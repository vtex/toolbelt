import { IOContext } from '@vtex/api'
import { ManifestEditor } from '../lib/manifest'
import { cluster } from '../env'
import * as url from 'url'
import * as WebSocket from 'ws'
import { getToken } from '../conf'

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

  public executeCommand = async (command: string, interactive: boolean) => {
    const manifest = await ManifestEditor.getManifestEditor()
    const { name, vendor, builders } = manifest
    const { dotnet, node, 'service-js': serviceJs } = builders
    if (!dotnet && !node && !serviceJs) {
      return
    }

    const host = `${name}.${vendor}.${this.region}.vtex.io`
    const path = `/${this.account}/${this.workspace}/_exec`
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
        __v: manifest.majorRange,
        params: command?.split(' '),
        interactive,
      },
    }
    const formattedUrl = url.format(urlObject)

    const ws = new WebSocket(formattedUrl, clientOptions)
    const wsDuplexStream = (WebSocket as any).createWebSocketStream(ws, { encoding: 'utf8' })

    if (interactive) {
      process.stdin.pipe(wsDuplexStream, { end: false })
      process.stdin.on('end', () => {
        wsDuplexStream.end(EOT)
      })
    }

    wsDuplexStream.pipe(process.stdout)
  }
}
