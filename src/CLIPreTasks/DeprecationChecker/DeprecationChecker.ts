import chalk from 'chalk'
import { join } from 'path'
import { spawnUnblockingChildProcess } from '../../lib/utils/spawnUnblockingChildProcess'
import { DeprecationCheckerStore, IDeprecationCheckerStore, VersionDeprecationInfo } from './DeprecationCheckerStore'
import { ColorifyConstants } from '../../api/constants/Colors'

export class DeprecationChecker {
  private static readonly DEPRECATION_CHECK_INTERVAL = 1 * 3600 * 1000
  private static readonly DEPRECATION_CHECKER_STORE_FILENAME = 'deprecation-checking.json'

  private static singleton: DeprecationChecker
  public static checkForDeprecation(storeDir: string, pkgJson: any) {
    if (!DeprecationChecker.singleton) {
      const store = new DeprecationCheckerStore(join(storeDir, DeprecationChecker.DEPRECATION_CHECKER_STORE_FILENAME))
      DeprecationChecker.singleton = new DeprecationChecker(store, pkgJson)
    }

    const checker = DeprecationChecker.singleton
    if (checker.shouldCheckNpm()) {
      checker.startCheckerProcess()
    }

    if (!checker.isDeprecated()) {
      return
    }

    const errMsg =
      `${chalk.bold(
        `Your Toolbelt version (${pkgJson.version}) was deprecated`
      )}. You must update using the same method you used to install. Here are some examples:` +
      `\n\n` +
      `• If you installed using ${ColorifyConstants.COMMAND_OR_VTEX_REF(
        `yarn`
      )}, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(`yarn global add vtex`)}.` +
      `\n\n` +
      `• If you installed using our new method there is in alpha-version, update running ${ColorifyConstants.COMMAND_OR_VTEX_REF(
        `vtex autoupdate`
      )}.`

    console.error(errMsg)
    process.exit(1)
  }

  private deprecationInfo: VersionDeprecationInfo

  constructor(private store: IDeprecationCheckerStore, private pkg: any) {
    this.deprecationInfo = store.getVersionDeprecationInfo()
  }

  public shouldCheckNpm() {
    return (
      this.deprecationInfo.versionChecked !== this.pkg.version ||
      Date.now() - this.store.getLastDeprecationCheck() >= DeprecationChecker.DEPRECATION_CHECK_INTERVAL
    )
  }

  public startCheckerProcess() {
    spawnUnblockingChildProcess(process.execPath, [
      join(__dirname, 'checkForDeprecate.js'),
      this.store.storeFilePath,
      this.pkg.name,
      this.pkg.version,
    ])
  }

  public isDeprecated() {
    if (this.deprecationInfo.versionChecked === this.pkg.version && this.deprecationInfo.deprecated) {
      return true
    }

    return false
  }
}
