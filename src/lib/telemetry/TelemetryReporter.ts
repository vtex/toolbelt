import { ensureFile, readdir, readJson, remove, writeJson } from 'fs-extra'
import { randomBytes } from 'crypto'

import { TelemetryClient } from '../../clients/telemetryClient'
import { region } from '../../env'
import userAgent from '../../user-agent'
import { createIOContext, createTelemetryClient } from '../clients'
import { SessionManager } from '../session/SessionManager'
import { TelemetryLocalStore } from './TelemetryStore'
import { ErrorReport } from '../error/ErrorReport'

export class TelemetryReporter {
  private static readonly RETRIES = 3
  private static readonly TIMEOUT = 30 * 1000
  public static readonly ERRORS_DIR = '~/.config/configstore/vtex/errors'
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

    // Send general toolbelt errors
    const telemetryObjFilePath = process.argv[3]
    const telemetryObj = await readJson(telemetryObjFilePath)
    await remove(telemetryObjFilePath)
    const reporter = TelemetryReporter.getTelemetryReporter()
    await reporter.reportErrors(telemetryObj.errors)

    // Send TelemetryReport errors
    const metaErrorsFiles = await readdir(TelemetryReporter.ERRORS_DIR)
    await Promise.all(metaErrorsFiles.map(async (metaErrorsFile) => {
      const metaErrorsObject = await readJson(metaErrorsFile)
      const reporter = TelemetryReporter.getTelemetryReporter()
      await reporter.reportErrors(metaErrorsObject)
      await remove(metaErrorsFile)
    }))

    store.setLastRemoteFlush(Date.now())
    process.exit()
  } catch (err) {
    const errorFilePath = `${TelemetryReporter.ERRORS_DIR}-${randomBytes(8).toString()}.json`
    let errorReport = err
    if (!(err instanceof ErrorReport)) {
      const code = ErrorReport.createGenericCode(err)
      errorReport = ErrorReport.create({
        code,
        message: err.message,
        originalError: err,
        tryToParseError: true,
      })
    }
    await ensureFile(errorFilePath)
    await writeJson(errorFilePath, errorReport)
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}
