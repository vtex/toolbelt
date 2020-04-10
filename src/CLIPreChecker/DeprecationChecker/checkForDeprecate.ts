import { NpmClient } from '../../clients/npmClient'
import { DeprecationCheckerStore, IDeprecationCheckerStore } from './DeprecationCheckerStore'
import { TelemetryCollector } from '../../utils/telemetry/TelemetryCollector'
import { ErrorReport } from '../../utils/error/ErrorReport'
import { ErrorKinds } from '../../utils/error/ErrorKinds'

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

    await telemetryCollector.flush()
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
