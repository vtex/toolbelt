import { join } from 'path'
import { spawnUnblockingChildProcess } from '../../lib/utils/spawnUnblockingChildProcess'
import { FeatureFlag } from '../../api/modules/featureFlag'

export class FeatureFlagUpdateChecker {
  private static readonly FEATURE_FLAG_CHECK_INTERVAL = 1000 * 60 * 2 // 2 Minutes

  public static checkForUpdateFeatureFlag() {
    if (FeatureFlagUpdateChecker.shouldUpdateFeatureFlagFile()) {
      FeatureFlagUpdateChecker.startUpdateFileProcess()
    }
  }

  private static shouldUpdateFeatureFlagFile() {
    const invervalFromLastUpdate: number = Date.now() - FeatureFlag.getSingleton().getLastFeatureFlagUpdate()
    return invervalFromLastUpdate >= FeatureFlagUpdateChecker.FEATURE_FLAG_CHECK_INTERVAL
  }

  private static startUpdateFileProcess() {
    spawnUnblockingChildProcess(process.execPath, [join(__dirname, 'featureFlagUpdateExec.js')])
  }
}
