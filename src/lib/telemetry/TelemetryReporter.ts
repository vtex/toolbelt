import { readJson, remove } from 'fs-extra'

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
    const telemetryObjFilePath = process.argv[3]
    const telemetryObj = await readJson(telemetryObjFilePath)
    await remove(telemetryObjFilePath)
    const reporter = TelemetryReporter.getTelemetryReporter()
    await reporter.reportErrors(telemetryObj.errors)
    store.setLastRemoteFlush(Date.now())
    process.exit()
  } catch (err) {
    // Here we should write a file with the error in TelemetryReporter, since it cannot write in stdio
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}
