import Configstore from 'configstore'

export interface VersionDeprecationInfo {
  versionChecked: string
  deprecated: boolean
}

export interface IDeprecationCheckerStore {
  storeFilePath: string
  getLastDeprecationCheck: () => number
  setLastDeprecationCheck: (date: number) => void
  getVersionDeprecationInfo: () => VersionDeprecationInfo
  setVersionDeprecationInfo: (info: VersionDeprecationInfo) => void
}

export class DeprecationCheckerStore implements IDeprecationCheckerStore {
  private store: Configstore
  constructor(public storeFilePath: string) {
    this.store = new Configstore('', null, { configPath: storeFilePath })
  }

  getLastDeprecationCheck() {
    return (this.store.get('lastDeprecationCheck') as number) ?? 0
  }

  getVersionDeprecationInfo() {
    return (
      (this.store.get('versionDeprecationInfo') as VersionDeprecationInfo | null) ?? {
        versionChecked: '',
        deprecated: true,
      }
    )
  }

  setLastDeprecationCheck(date: number) {
    this.store.set('lastDeprecationCheck', date)
  }

  setVersionDeprecationInfo(versionDeprecationInfo: VersionDeprecationInfo) {
    this.store.set('versionDeprecationInfo', versionDeprecationInfo)
  }
}
