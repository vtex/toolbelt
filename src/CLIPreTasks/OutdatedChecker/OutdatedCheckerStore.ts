import Configstore from 'configstore'

export interface OutdatedInfo {
  versionChecked: string
  outdated: boolean
}

export interface IOutdatedCheckerStore {
  storeFilePath: string
  getLastOutdatedCheck: () => number
  setLastOutdatedCheck: (date: number) => void
  getOutdatedInfo: () => OutdatedInfo
  setOutdatedInfo: (info: OutdatedInfo) => void
}

export class OutdatedCheckerStore implements IOutdatedCheckerStore {
  private store: Configstore
  constructor(public storeFilePath: string) {
    this.store = new Configstore('', null, { configPath: storeFilePath })
  }

  getLastOutdatedCheck() {
    return (this.store.get('lastOutdatedCheck') as number) ?? 0
  }

  getOutdatedInfo() {
    return (this.store.get('outdatedInfo') as OutdatedInfo | null) ?? { versionChecked: '', outdated: false }
  }

  setLastOutdatedCheck(date: number) {
    this.store.set('lastOutdatedCheck', date)
  }

  setOutdatedInfo(versionOutdatedInfo: OutdatedInfo) {
    this.store.set('outdatedInfo', versionOutdatedInfo)
  }
}
