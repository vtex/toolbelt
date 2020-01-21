import * as WebSocket from 'ws'
import * as url from 'url'
import { getAccount, getToken, getWorkspace } from '../../conf'
import { getManifest } from '../../manifest'
import { region } from '../../env'
import { toMajorRange } from '../../locator'
const EOT = '\x04'
export default async (command: string, options) => {
  const manifest = await getManifest()
  const { name, vendor, version, builders } = manifest
  const { dotnet, node, 'service-js': serviceJs } = builders
  if (!dotnet && !node && !serviceJs) {
    return
  }
  const majorRange = toMajorRange(version)
  const host = `${name}.${vendor}.${region()}.vtex.io`
  const path = `/${getAccount()}/${getWorkspace()}/_exec`
  const clientOptions = {
    headers: {
      Authorization: getToken(),
      Host: host,
      'X-Vtex-Runtime-Api': 'true',
    },
  }
  var urlObject = {
    protocol: 'ws',
    hostname: host,
    pathname: path,
    query: {
      __v: majorRange,
      params: command?.split(' '),
      interactive: options.i || options.interactive,
    },
  }
  const formattedUrl = url.format(urlObject)
  const ws = new WebSocket(formattedUrl, clientOptions)
  ws.on('open', function open() {
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', function(chunk) {
      ws.send(chunk)
    })
    process.stdin.on('end', function() {
      ws.send(EOT)
    })
  })
  ws.on('close', function close() {
    process.exit(0)
  })
  ws.on('message', function incoming(data) {
    process.stdout.write(data.toString())
  })
}
