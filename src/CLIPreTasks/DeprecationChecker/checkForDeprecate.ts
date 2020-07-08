import { NpmClient } from '../../api/clients/NpmClient'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { DeprecationCheckerStore, IDeprecationCheckerStore } from './DeprecationCheckerStore'

export const checkForDeprecate = async (store: IDeprecationCheckerStore, pkgName: string, pkgVersion: string) => {
  try {
    const { deprecated } = await NpmClient.getPackageMetadata(pkgName, pkgVersion)
    store.setVersionDeprecationInfo({
      versionChecked: pkgVersion,
      deprecated: deprecated != null,
    })

    store.setLastDeprecationCheck(Date.now())
    process.exit()
  } catch (err) {
    const telemetryCollector = TelemetryCollector.getCollector()
    telemetryCollector.registerError(
      ErrorReport.create({
        kind: ErrorKinds.DEPRECATION_CHECK_ERROR,
        originalError: err,
      })
    )

    telemetryCollector.flush()
    process.exit(1)
  }
}

if (require.main === module) {
  // eslint-disable-next-line prefer-destructuring
  const storeFilePath = process.argv[2]
  const store = new DeprecationCheckerStore(storeFilePath)
  // eslint-disable-next-line prefer-destructuring
  const pkgName = process.argv[3]
  // eslint-disable-next-line prefer-destructuring
  const pkgVersion = process.argv[4]
  checkForDeprecate(store, pkgName, pkgVersion)
}
