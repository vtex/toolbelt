import { getAccount, getWorkspace, getToken } from '../../conf'
import { parseLocator, toAppLocator } from '../../locator'
import { getManifest } from '../../manifest'
import CustomEventSource from '../../eventsource'
import userAgent from '../../user-agent'
import log from '../../logger'

export default async (optionalApp: string, options) => {
  const account = getAccount()
  const workspace = getWorkspace()
  const skidderMajor = 0
  
  const conf = {
    headers: {
      Authorization: `bearer ${getToken()}`,
      'user-agent': userAgent
    },
  }

  let appFilter = ''

  if (!options.all) {
    const app = optionalApp || toAppLocator(await getManifest())
    const { vendor, name } = parseLocator(app)
    appFilter = `${vendor}.${name}`
  }

  const uri = `http://infra.io.vtex.com/skidder/v${skidderMajor}/${account}/${workspace}/logs/stream/${account}/${appFilter}`

  log.info(`listening logs from ${uri}`)

  function createEventSource() {
    const es = new CustomEventSource(uri, conf)

    es.onerror = err => {
      log.error(`Error reading logs: ${err.message}`)
    }

    es.onclose = () => {
      log.warn('SSE connection closed. Reconnecting.')
      createEventSource()
    }

    es.addEventListener('message', msg => {
      log.log(msg.data)
    })
  }
  
  createEventSource()

  console.log('Press CTRL+C to abort')

  function wait() {
    setTimeout(wait, 1000)
  }
  
  wait()
}
