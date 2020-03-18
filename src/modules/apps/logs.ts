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
      'user-agent': `${userAgent}${options.ghost ? `#${Math.random()}` : ''}`,
    },
  }

  try {
    const manifest = await getManifest()
    vendor = vendor || manifest.vendor
    app = app || manifest.name
  } catch (err) {
    // manifest file was not found
    vendor = vendor || account

    if (!vendor) {
      console.error('vendor could not be specified, are you logged in?')
      throw err
    }

    if (!options.all && !app) {
      console.error('app could not be specified. Did you forget --all?')
      throw err
    }
  }

  if (options.all) {
    app = ''
  }

  let uri = `http://infra.io.vtex.com/skidder/v${skidderMajor}/${vendor}/${workspace}/logs/stream`
  if (app) {
    uri += `/${app}`
  }

  function createEventSource() {
    const es = new CustomEventSource(uri, conf)
    console.info(`Listening ${vendor}${app ? `.${app}` : ''} logs`)

    es.onopen = () => {
      log.info(`Open with ${uri} is open`)
    }

    es.onerror = err => {
      log.error(`Error reading logs: ${err.message}`)
    }

    es.onclose = () => {
      log.warn('SSE connection closed. Reconnecting.')
      createEventSource()
    }

    es.addEventListener('message', msg => {
      console.log(JSON.stringify(JSON.parse(msg.data).data, null, 2))
    })
  }

  createEventSource()

  console.log('Press CTRL+C to abort')
}
