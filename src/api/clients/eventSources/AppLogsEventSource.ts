import { randomBytes } from 'crypto'
import { ErrorKinds } from '../../error/ErrorKinds'
import { ErrorReport } from '../../error/ErrorReport'
import { CustomEventSource } from '../../../lib/sse/CustomEventSource'
import log from '../../logger'
import userAgent from '../../../user-agent'
import { SessionManager } from '../../session/SessionManager'
import { inspect } from 'util'

interface AppLogsEventSourceArgs {
  account: string
  workspace: string
  app: string
  userLogged: string
  showSeenLogs: boolean
}

interface CreateDefaultArgs {
  app: string
  showSeenLogs: boolean
}

export class AppLogsEventSource {
  public static SKIDDER_MAJOR = 1

  public static createDefault({ app, showSeenLogs }: CreateDefaultArgs) {
    const { account, workspace, userLogged } = SessionManager.getSingleton()
    return new AppLogsEventSource({
      account,
      workspace,
      app,
      showSeenLogs,
      userLogged,
    })
  }

  private uri: string
  private account: string
  private app: string
  private userAgent: string

  constructor({ account, workspace, app, showSeenLogs, userLogged }: AppLogsEventSourceArgs) {
    this.account = account
    this.app = app
    this.userAgent = `${userAgent}${showSeenLogs ? `#${randomBytes(8).toString('hex')}` : `#${userLogged}`}`

    this.uri = `https://infra.io.vtex.com/skidder/v${AppLogsEventSource.SKIDDER_MAJOR}/${account}/${workspace}/logs/stream`
    if (app) {
      this.uri += `/${app}`
    }
  }

  public createLogEventSource() {
    const es = CustomEventSource.create({
      source: this.uri,
      additionalHeaders: {
        'user-agent': this.userAgent,
      },
    })

    const streamLocator = `${this.account}${this.app ? `.${this.app}` : ''}`
    log.info(`Connecting to logs stream for ${streamLocator}`)
    log.debug(`Stream URI ${this.uri}`)

    es.onopen = () => {
      log.info(`Listening to ${streamLocator}'s logs`)
    }

    es.onerror = err => {
      const rep = ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.APP_LOGS_SSE_ERROR,
        originalError: err,
      })
      log.error(`Error reading logs: ${err.message} - [ErrorID: ${rep.metadata.errorId}]`)
    }

    es.addEventListener('message', msg => {
      try {
        log.info(inspect(JSON.parse(msg.data).data, true, 4, true))
      } catch (e) {
        log.error(e, msg.data)
        ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.APP_LOGS_PARSE_ERROR,
          originalError: e,
        })
      }
    })
  }
}
