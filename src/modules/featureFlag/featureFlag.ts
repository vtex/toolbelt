import Configstore from 'configstore'

export interface IFeatureFlag {
  storeFilePath: string
  getLastFeatureFlagUpdate: () => number
  setLastFeatureFlagUpdate: (date: number) => void
  getFeatureFlagInfo: () => Record<string, any>
  setFeatureFlagInfo: (info: Record<string, any>) => void
}

export class FeatureFlag implements IFeatureFlag {
  public static readonly FEATURE_FLAG_STORE_FILENAME = 'feature-flag.json'
  private static singleton: FeatureFlag

  public static getSingleton(storeFilePath?: string): FeatureFlag {
    if (FeatureFlag.singleton) {
      return FeatureFlag.singleton
    }

    FeatureFlag.singleton = new FeatureFlag(storeFilePath)
    return FeatureFlag.singleton
  }

  private store: Configstore

  constructor(public storeFilePath: string) {
    this.store = new Configstore('', null, { configPath: storeFilePath })
  }

  getLastFeatureFlagUpdate() {
    return (this.store.get('lastFeatureFlagCheck') as number) ?? 0
  }

  getFeatureFlagInfo() {
    return (this.store.get('featureFlagInfo') as Record<string, any> | null) ?? {}
  }

  setLastFeatureFlagUpdate(date: number) {
    this.store.set('lastFeatureFlagCheck', date)
  }

  setFeatureFlagInfo(versionFeatureFlagInfo: Record<string, any>) {
    this.store.set('featureFlagInfo', versionFeatureFlagInfo)
  }
}
