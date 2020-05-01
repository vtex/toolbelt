const initTime = process.hrtime()

import { ToolbeltConfigClient } from '../../clients/toolbeltConfigClient'
import { ErrorKinds } from '../../lib/error/ErrorKinds'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { hrTimeToMs } from '../../lib/utils/hrTimeToMs'
import { IOutdatedCheckerStore, OutdatedCheckerStore } from './OutdatedCheckerStore'
import { createLog } from '../../lib/utils/scriptLogging'

const log = createLog('checkForOutdated')

export const checkForOutdated = async (store: IOutdatedCheckerStore, pkgVersion: string) => {
  try {
    const client = ToolbeltConfigClient.createDefaultClient({ retries: 3 })
    const { validVersion } = await client.versionValidate(pkgVersion)
    store.setOutdatedInfo({
      versionChecked: pkgVersion,
      outdated: validVersion === false,
    })

    store.setLastOutdatedCheck(Date.now())
  } catch (err) {
    const telemetryCollector = TelemetryCollector.getCollector()
    const errorReport = telemetryCollector.registerError(
      ErrorReport.create({
        kind: ErrorKinds.OUTDATED_CHECK_ERROR,
        originalError: err,
      })
    )

    log({ event: 'error', ...errorReport.toObject() })
    telemetryCollector.flush()
  }
}

if (require.main === module) {
  // eslint-disable-next-line prefer-destructuring
  const storeFilePath = process.argv[2]
  const store = new OutdatedCheckerStore(storeFilePath)
  // eslint-disable-next-line prefer-destructuring
  const pkgVersion = process.argv[3]
  checkForOutdated(store, pkgVersion)
  process.on('exit', () => log({ event: 'finish', time: hrTimeToMs(process.hrtime(initTime)) }))
}
