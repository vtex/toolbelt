import chalk from 'chalk'
import semver from 'semver'
import { PathConstants } from '../lib/PathConstants'
import { DeprecationChecker } from './DeprecationChecker/DeprecationChecker'

export class CLIPreTasks {
  public static readonly PRETASKS_LOCAL_DIR = PathConstants.PRETASKS_FOLDER
  private static readonly BYPASS_LOCKS_FLAG = 'BYPASS_LOCKS'

  public static getCLIPreTasks(pkgJson: any) {
    return new CLIPreTasks(pkgJson)
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
    if (process.env[CLIPreTasks.BYPASS_LOCKS_FLAG] !== 'false') {
      this.ensureCompatibleNode()
      DeprecationChecker.checkForDeprecation(CLIPreTasks.PRETASKS_LOCAL_DIR, this.pkg)
    }
  }
}
