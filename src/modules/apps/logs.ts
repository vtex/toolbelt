import { getManifest } from '../../manifest'
import userAgent from '../../user-agent'
import log from '../../logger'
import { AuthType } from '@vtex/api'
import { CustomEventSource } from '../../lib/sse/CustomEventSource'
import { SessionManager } from '../../lib/session/SessionManager'
import { randomBytes } from 'crypto'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { ErrorKinds } from '../../lib/error/ErrorKinds'

const SKIDDER_MAJOR = 1

export default async (app: string, options) => {
  const session = SessionManager.getSingleton()
  const { account, workspace, token, userLogged } = session

  const conf = {
    headers: {
      Authorization: `${AuthType.bearer} ${token}`,
      'user-agent': `${userAgent}${options.past ? `#${randomBytes(8).toString('hex')}` : `#${userLogged}`}`,
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

  let uri = `http://infra.io.vtex.com/skidder/v${SKIDDER_MAJOR}/${account}/${workspace}/logs/stream`
  if (app) {
    uri += `/${app}`
  }

  function createLogEventSource() {
    const es = new CustomEventSource(uri, conf)
    const streamLocator = `${account}${app ? `.${app}` : ''}`
    log.info(`Connecting to logs stream for ${streamLocator}`)
    log.debug(`Stream URI ${uri}`)

    es.onopen = () => {
      log.info(`Listening to ${streamLocator}'s logs`)
    }

    es.onerror = err => {
      log.error(`Error reading logs: ${err.message}`)
      ErrorReport.createAndRegisterOnTelemetry({
        kind: ErrorKinds.APP_LOGS_SSE_ERROR,
        originalError: err,
      })
    }

    es.addEventListener('message', msg => {
      try {
        log.info(JSON.parse(msg.data).data)
      } catch (e) {
        log.error(e, msg.data)
        ErrorReport.createAndRegisterOnTelemetry({
          kind: ErrorKinds.APP_LOGS_PARSE_ERROR,
          originalError: e,
        })
      }
    })
  }

  createLogEventSource()

  console.log('Press CTRL+C to abort')
}
