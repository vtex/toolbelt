import Configstore from 'configstore'
import { join } from 'path'
import { PathConstants } from '../../lib/PathConstants'

export interface ILocalCacheUpdaterStore {
  storeFilePath: string
  getLastUpdate: () => number
  setLastUpdate: (date: number) => void
}

export class LocalCacheUpdaterStore implements ILocalCacheUpdaterStore {
  public static getStore(id: string) {
    return new LocalCacheUpdaterStore(join(PathConstants.CACHE_FOLDER, `${id}-timing`))
  }

  private store: Configstore
  constructor(public storeFilePath: string) {
    this.store = new Configstore('', {}, { configPath: storeFilePath })
  }

  public getLastUpdate() {
    return (this.store.get('lastUpdate') as number) ?? 0
  }

  public setLastUpdate(date: number) {
    this.store.set('lastUpdate', date)
  }
}
