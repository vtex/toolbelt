import Configstore from 'configstore'
import { join } from 'path'
import { CLIPreTasks } from '../../CLIPreTasks/CLIPreTasks'

export interface IFeatureFlag {
  storeFilePath: string
  getLastFeatureFlagUpdate: () => number
  setLastFeatureFlagUpdate: (date: number) => void
  getAllFeatureFlagInfo: () => Record<string, any>
  getFeatureFlagInfo: <T>(flagName: string) => T
  setFeatureFlagInfo: (info: Record<string, any>) => void
}

export class FeatureFlag implements IFeatureFlag {
  public static readonly FEATURE_FLAG_STORE_FILENAME = 'feature-flag.json'
  private static singleton: FeatureFlag

  public static getSingleton(): FeatureFlag {
    if (FeatureFlag.singleton) {
      return FeatureFlag.singleton
    }

    FeatureFlag.singleton = new FeatureFlag(
      join(CLIPreTasks.PRETASKS_LOCAL_DIR, FeatureFlag.FEATURE_FLAG_STORE_FILENAME)
    )
    return FeatureFlag.singleton
  }

  private store: Configstore

  constructor(public storeFilePath: string) {
    this.store = new Configstore('', null, { configPath: storeFilePath })
  }

  getLastFeatureFlagUpdate() {
    return (this.store.get('lastFeatureFlagCheck') as number) ?? 0
  }

  getAllFeatureFlagInfo() {
    return (this.store.get('featureFlagInfo') as Record<string, any> | null) ?? {}
  }

  getFeatureFlagInfo<T>(flagName: string): T {
    return this.store.get(`featureFlagInfo.${flagName}`) as T
  }

  setLastFeatureFlagUpdate(date: number) {
    this.store.set('lastFeatureFlagCheck', date)
  }

  setFeatureFlagInfo(versionFeatureFlagInfo: Record<string, any>) {
    this.store.set('featureFlagInfo', versionFeatureFlagInfo)
  }
}
