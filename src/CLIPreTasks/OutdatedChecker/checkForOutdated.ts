const initTime = process.hrtime()

import { ToolbeltConfig } from '../../api/clients/IOClients/apps/ToolbeltConfig'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { hrTimeToMs } from '../../lib/utils/hrTimeToMs'
import { IOutdatedCheckerStore, OutdatedCheckerStore } from './OutdatedCheckerStore'

export const checkForOutdated = async (store: IOutdatedCheckerStore, pkgVersion: string) => {
  try {
    const client = ToolbeltConfig.createClient({}, { retries: 3 })
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

    console.error('Error checking for outdated', JSON.stringify(errorReport.toObject(), null, 2))
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
  console.log(`Finished checking for outdated after ${hrTimeToMs(process.hrtime(initTime))}`)
}
