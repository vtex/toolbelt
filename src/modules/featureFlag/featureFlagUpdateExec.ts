import { ToolbeltConfig } from '../../api/clients/IOClients/apps/ToolbeltConfig'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { hrTimeToMs } from '../../lib/utils/hrTimeToMs'
import { IFeatureFlag, FeatureFlag } from './featureFlag'

const initTime = process.hrtime()

export const updateFeatureFlagsFile = async (store: IFeatureFlag) => {
  try {
    const client = ToolbeltConfig.createClient({}, { retries: 3 })
    const { featureFlags } = await client.getGlobalConfig()

    store.setFeatureFlagInfo(featureFlags)
    store.setLastFeatureFlagUpdate(Date.now())
  } catch (err) {
    const telemetryCollector = TelemetryCollector.getCollector()
    const errorReport = telemetryCollector.registerError(
      ErrorReport.create({
        kind: ErrorKinds.FEATURE_FLAG_CHECK_ERROR,
        originalError: err,
      })
    )

    console.error('Error checking for feature flag', JSON.stringify(errorReport.toObject(), null, 2))
    telemetryCollector.flush()
  }
}

if (require.main === module) {
  // eslint-disable-next-line prefer-destructuring
  const storeFilePath = process.argv[2]
  const store = FeatureFlag.getSingleton(storeFilePath)
  // eslint-disable-next-line prefer-destructuring
  updateFeatureFlagsFile(store)
  console.log(`Finished checking for feature flag after ${hrTimeToMs(process.hrtime(initTime))}`)
}
