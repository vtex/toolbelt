import log from '../../../logger'
import { CustomEventSource } from '../../../lib/sse/CustomEventSource'
import { ErrorReport } from '../../../lib/error/ErrorReport'
import { ErrorKinds } from '../../../lib/error/ErrorKinds'

const SKIDDER_MAJOR = 1

export class AppLogsEventSource {
  uri: string
  account: string
  workspace: string
  app: string
  conf: Record<string, any>

  // eslint-disable-next-line max-params
  public constructor(account: string, workspace: string, app: string, conf: any) {
    this.account = account
    this.workspace = workspace
    this.app = app
    this.conf = conf

    this.uri = `http://infra.io.vtex.com/skidder/v${SKIDDER_MAJOR}/${account}/${workspace}/logs/stream`
    if (app) {
      this.uri += `/${app}`
    }
  }

  public createLogEventSource() {
    const es = new CustomEventSource(this.uri, this.conf)
    const streamLocator = `${this.account}${this.app ? `.${this.app}` : ''}`
    log.info(`Connecting to logs stream for ${streamLocator}`)
    log.debug(`Stream URI ${this.uri}`)

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
}
