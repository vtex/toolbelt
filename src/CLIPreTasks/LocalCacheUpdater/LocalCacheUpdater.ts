import { spawn } from 'child_process'
import { join } from 'path'
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
    storagesWithCache.forEach(storageToCheck => {
      const updater: CacheUpdater = require(storageToCheck.cacheUpdaterPath)
      const store = LocalCacheUpdaterStore.getStore(storageToCheck.id)
      if (updater.shouldUpdateCache(store.getLastUpdate())) {
        LocalCacheUpdater.startUpdaterProcess(storageToCheck)
      }
    })
  }

  private static startUpdaterProcess(storageToCheck: StorageWithCacheInfo) {
    spawn(
      process.execPath,
      [join(__dirname, 'updateLocalCache.js'), storageToCheck.id, storageToCheck.cacheUpdaterPath],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref()
  }
}
