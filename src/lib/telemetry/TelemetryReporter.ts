import { TelemetryClient } from '../../clients/telemetryClient'
import { region } from '../../env'
import userAgent from '../../user-agent'
import { createIOContext, createTelemetryClient } from '../clients'
import { SessionManager } from '../session/SessionManager'
import { TelemetryLocalStore } from './TelemetryStore'

export class TelemetryReporter {
  private static readonly RETRIES = 3
  private static readonly TIMEOUT = 30 * 1000
  public static getTelemetryReporter() {
    const { account, workspace, token } = SessionManager.getSessionManager()
    const telemetryClient = createTelemetryClient(
      createIOContext({
        account,
        workspace,
        authToken: token,
        userAgent,
        region: region(),
      }),
      { retries: TelemetryReporter.RETRIES, timeout: TelemetryReporter.TIMEOUT }
    )

    return new TelemetryReporter(telemetryClient)
  }

  constructor(private telemetryClient: TelemetryClient) {}

  public reportErrors(errors: any[]) {
    return this.telemetryClient.reportErrors(errors)
  }
}

const start = async () => {
  try {
    const store = new TelemetryLocalStore(process.argv[2])
    const telemetryObj = JSON.parse(process.argv[3])
    const reporter = TelemetryReporter.getTelemetryReporter()
    await reporter.reportErrors(telemetryObj.errors)
    store.setLastRemoteFlush(Date.now())
    process.exit()
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}
