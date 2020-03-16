import { getAccount, getToken } from '../../conf'
import { getManifest } from '../../manifest'
import CustomEventSource from '../../eventsource'
import userAgent from '../../user-agent'
import log from '../../logger'
import { AuthType } from '@vtex/api'

export default async (vendor: string, app: string, options) => {
  const account = getAccount()
  const workspace = 'master'
  const skidderMajor = 1

  const conf = {
    headers: {
      Authorization: `${AuthType.bearer} ${getToken()}`,
      'user-agent': userAgent,
    },
  }

  vendor = vendor || account

  if (!vendor || (!options.all && !app)) {
    const manifest = await getManifest()
    vendor = vendor || manifest.vendor
    app = app || manifest.name
  }

  let uri = `http://infra.io.vtex.com/skidder/v${skidderMajor}/${vendor}/${workspace}/logs/stream`
  if (app) {
    uri += `/${app}`
  }

  function createEventSource() {
    const es = new CustomEventSource(uri, conf)

    es.onopen = () => {
      log.info(`Listening ${vendor}${app ? `.${app}` : ''} logs`)
    }

    es.onerror = err => {
      log.error(`Error reading logs: ${err.message}`)
    }

    es.onclose = () => {
      log.warn('SSE connection closed. Reconnecting.')
      createEventSource()
    }

    es.addEventListener('message', msg => {
      console.log(JSON.parse(msg.data).data)
    })
  }

  createEventSource()

  console.log('Press CTRL+C to abort')
}
