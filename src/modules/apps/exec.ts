import * as WebSocket from 'ws'
import * as url from 'url'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { cluster, region } from '../../env'
import { ManifestEditor } from '../../lib/manifest'

const EOT = '\x04'

export default async (command: string, options) => {
  const manifest = await ManifestEditor.getManifestEditor()
  const { name, vendor, builders } = manifest
  const { dotnet, node, 'service-js': serviceJs } = builders
  if (!dotnet && !node && !serviceJs) {
    return
  }

  const host = `${name}.${vendor}.${region()}.vtex.io`
  const path = `/${getAccount()}/${getWorkspace()}/_exec`
  const clusterHeader = cluster() ? { 'x-vtex-upstream-target': cluster() } : null

  const clientOptions = {
    headers: {
      Authorization: getToken(),
      Host: host,
      'X-Vtex-Runtime-Api': 'true',
      ...clusterHeader,
    },
  }
  const interactive = options.i || options.interactive

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
