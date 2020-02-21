import Configstore from 'configstore'

export interface ICLIPrecheckerStore {
  storeName: string
  getLastDeprecationCheck: () => number
  setLastDeprecationCheck: (date: number) => void
  getDeprecated: () => boolean | null
  setDeprecated: (deprecated: boolean) => void
}

export class CLIPrecheckerStore implements ICLIPrecheckerStore {
  private store: Configstore
  public storeName: string
  constructor(storeName: string) {
    this.storeName = storeName
    this.store = new Configstore(storeName)
  }

  getLastDeprecationCheck() {
    return this.store.get('lastDeprecationCheck') ?? 0
  }

  getDeprecated() {
    return this.store.get('deprecated')
  }

  setLastDeprecationCheck(date: number) {
    this.store.set('lastDeprecationCheck', date)
  }

  setDeprecated(deprecated: boolean) {
    this.store.set('deprecated', deprecated)
  }
}
