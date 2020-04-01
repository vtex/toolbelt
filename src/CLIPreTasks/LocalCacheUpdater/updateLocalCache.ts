import { ErrorKinds } from '../../lib/error/ErrorKinds'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { TelemetryCollector } from '../../lib/telemetry/TelemetryCollector'
import { CacheUpdater, StorageWithCacheInfo } from './LocalCacheUpdater'
import { LocalCacheUpdaterStore } from './LocalCacheUpdaterStore'

const update = async (storageWithCacheInfo: StorageWithCacheInfo) => {
  try {
    const store = LocalCacheUpdaterStore.getStore(storageWithCacheInfo.id)
    const { updateCache } = require(storageWithCacheInfo.cacheUpdaterPath) as CacheUpdater

    await updateCache()

    store.setLastUpdate(Date.now())

    process.exit()
  } catch (err) {
    const telemetryCollector = TelemetryCollector.getCollector()
    telemetryCollector.registerError(
      ErrorReport.create({
        kind: ErrorKinds.LOCAL_CACHE_UPDATER_ERROR,
        originalError: err,
      })
    )

    await telemetryCollector.flush()
    process.exit(1)
  }
}

if (require.main === module) {
  const storeWithCacheId = process.argv[2]
  const cacheUpdaterPath = process.argv[3]
  update({
    id: storeWithCacheId,
    cacheUpdaterPath,
  })
}
