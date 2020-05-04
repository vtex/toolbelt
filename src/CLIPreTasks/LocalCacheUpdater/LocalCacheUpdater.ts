import { ensureDirSync } from 'fs-extra'
import { join } from 'path'
import { PathConstants } from '../../lib/constants/Paths'
import { spawnUnblockingChildProcess } from '../../lib/utils/spawnUnblockingChildProcess'
import { LocalCacheUpdaterStore } from './LocalCacheUpdaterStore'

export interface CacheUpdater {
  shouldUpdateCache: (lastUpdate: number) => boolean
  updateCache: () => Promise<void> | void
}

export interface StorageWithCacheInfo {
  id: string
  cacheUpdaterPath: string
}

export class LocalCacheUpdater {
  public static maybeUpdateCaches(storagesWithCache: StorageWithCacheInfo[]) {
    ensureDirSync(PathConstants.CACHE_FOLDER)
    storagesWithCache.forEach(storageToCheck => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const updater: CacheUpdater = require(storageToCheck.cacheUpdaterPath).default
      const store = LocalCacheUpdaterStore.getStore(storageToCheck.id)
      if (updater.shouldUpdateCache(store.getLastUpdate())) {
        LocalCacheUpdater.startUpdaterProcess(storageToCheck)
      }
    })
  }

  private static startUpdaterProcess(storageToCheck: StorageWithCacheInfo) {
    spawnUnblockingChildProcess(process.execPath, [
      join(__dirname, 'updateLocalCache.js'),
      storageToCheck.id,
      storageToCheck.cacheUpdaterPath,
    ])
  }
}
