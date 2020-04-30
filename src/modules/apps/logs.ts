import { getAccount, getToken } from '../../conf'
import { getManifest } from '../../manifest'
import userAgent from '../../user-agent'
import log from '../../logger'
import { AuthType } from '@vtex/api'
import { CustomEventSource } from '../../lib/sse/CustomEventSource'

export default async (app: string, options) => {
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
    app = app || manifest.name
  } catch (err) {
    // manifest file was not found

    if (!account) {
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

  let uri = `http://infra.io.vtex.com/skidder/v${skidderMajor}/${account}/${workspace}/logs/stream`
  if (app) {
    uri += `/${app}`
  }

  function createEventSource() {
    const es = new CustomEventSource(uri, conf)
    console.info(`Listening ${account}${app ? `.${app}` : ''} logs`)

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
      try {
        console.log(JSON.stringify(JSON.parse(msg.data).data, null, 2))
        // eslint-disable-next-line no-empty
      } catch (e) {}
    })
  }

  createEventSource()

  console.log('Press CTRL+C to abort')
}
