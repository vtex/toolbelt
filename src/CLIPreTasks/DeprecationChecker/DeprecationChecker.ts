import chalk from 'chalk'
import { spawn } from 'child_process'
import { join } from 'path'
import { DeprecationCheckerStore, IDeprecationCheckerStore, VersionDeprecationInfo } from './DeprecationCheckerStore'

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

    const errMsg = chalk.bold(
      `This version ${pkgJson.version} was deprecated. Please update to the latest version: ${chalk.green(
        'yarn global add vtex'
      )}.`
    )

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
    spawn(
      process.execPath,
      [join(__dirname, 'checkForDeprecate.js'), this.store.storeFilePath, this.pkg.name, this.pkg.version],
      {
        detached: true,
        stdio: 'ignore',
      }
    ).unref()
  }

  public isDeprecated() {
    if (this.deprecationInfo.versionChecked === this.pkg.version && this.deprecationInfo.deprecated) {
      return true
    }

    return false
  }
}
