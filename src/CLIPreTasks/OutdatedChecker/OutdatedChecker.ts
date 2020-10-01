import chalk from 'chalk'
import { join } from 'path'
import { spawnUnblockingChildProcess } from '../../lib/utils/spawnUnblockingChildProcess'
import { IOutdatedCheckerStore, OutdatedCheckerStore, OutdatedInfo } from './OutdatedCheckerStore'
import { ColorifyConstants } from '../../api/constants/Colors'

export class OutdatedChecker {
  private static readonly OUTDATED_CHECK_INTERVAL = 1 * 3600 * 1000
  private static readonly OUTDATED_CHECKER_STORE_FILENAME = 'outdated-checking.json'

  private static singleton: OutdatedChecker
  public static checkForOutdate(storeDir: string, pkgJson: any) {
    if (!OutdatedChecker.singleton) {
      const store = new OutdatedCheckerStore(join(storeDir, OutdatedChecker.OUTDATED_CHECKER_STORE_FILENAME))
      OutdatedChecker.singleton = new OutdatedChecker(store, pkgJson)
    }

    const checker = OutdatedChecker.singleton
    if (checker.shouldCheckOutdated()) {
      checker.startCheckerProcess()
    }

    if (!checker.isOutdated()) {
      return
    }

    const errMsg =
      `${chalk.bold(
        `Your Toolbelt version (${pkgJson.version}) is outdated`
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

  private outdatedInfo: OutdatedInfo

  constructor(private store: IOutdatedCheckerStore, private pkg: any) {
    this.outdatedInfo = store.getOutdatedInfo()
  }

  public shouldCheckOutdated() {
    return (
      this.outdatedInfo.outdated ||
      this.outdatedInfo.versionChecked !== this.pkg.version ||
      Date.now() - this.store.getLastOutdatedCheck() >= OutdatedChecker.OUTDATED_CHECK_INTERVAL
    )
  }

  public startCheckerProcess() {
    spawnUnblockingChildProcess(process.execPath, [
      join(__dirname, 'checkForOutdated.js'),
      this.store.storeFilePath,
      this.pkg.version,
    ])
  }

  public isOutdated() {
    if (this.outdatedInfo.versionChecked === this.pkg.version && this.outdatedInfo.outdated) {
      return true
    }

    return false
  }
}
