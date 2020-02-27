import chalk from 'chalk'
import { spawn } from 'child_process'
import { join } from 'path'
import semver from 'semver'
import { CLIPrecheckerStore, ICLIPrecheckerStore } from './CLIPrecheckerStore'

export class CLIPrechecker {
  private static readonly DEPRECATION_CHECK_INTERVAL = 4 * 3600 * 1000

  public static getCLIPrechecker(pkgJson: any) {
    const store = new CLIPrecheckerStore(`${pkgJson.name}-prechecker-store`)
    return new CLIPrechecker(store, pkgJson)
  }

  constructor(private store: ICLIPrecheckerStore, private pkg: any) {}

  private ensureCompatibleNode() {
    const nodeVersion = process.version
    if (!semver.satisfies(nodeVersion, this.pkg.engines.node)) {
      const minMajor = this.pkg.engines.node.replace('>=', '')
      const errMsg = chalk.bold(
        `Incompatible with node < v${minMajor}. Please upgrade node to major ${minMajor} or higher.`
      )

      console.error(errMsg)
      process.exit(1)
    }
  }

  private ensureNotDeprecated() {
    const deprecated = this.store.getDeprecated()
    if (Date.now() - this.store.getLastDeprecationCheck() >= CLIPrechecker.DEPRECATION_CHECK_INTERVAL) {
      spawn(
        process.execPath,
        [join(__dirname, 'checkForDeprecate.js'), this.store.storeName, this.pkg.name, this.pkg.version],
        {
          detached: true,
          stdio: 'ignore',
        }
      ).unref()
    }

    if (!deprecated) return
    const errMsg = chalk.bold(
      `This version ${this.pkg.version} was deprecated. Please update to the latest version: ${chalk.green(
        'yarn global add vtex'
      )}.`
    )

    console.error(errMsg)
    process.exit(1)
  }

  public runChecks() {
    this.ensureCompatibleNode()
    this.ensureNotDeprecated()
  }
}
