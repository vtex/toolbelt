import chalk from 'chalk'
import { join } from 'path'
import semver from 'semver'
import { configDir } from '../conf'
import { DeprecationChecker } from './DeprecationChecker/DeprecationChecker'

export class CLIPrechecker {
  public static readonly PRECHECKS_LOCAL_DIR = join(configDir, 'vtex', 'prechecks')

  public static getCLIPrechecker(pkgJson: any) {
    return new CLIPrechecker(pkgJson)
  }

  constructor(private pkg: any) {}

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

  public runChecks() {
    this.ensureCompatibleNode()
    DeprecationChecker.checkForDeprecation(CLIPrechecker.PRECHECKS_LOCAL_DIR, this.pkg)
  }
}
