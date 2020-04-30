import chalk from 'chalk'
import { pathExistsSync, removeSync } from 'fs-extra'
import { join } from 'path'
import semver from 'semver'
import { configDir } from '../conf'
import { PathConstants } from '../lib/constants/Paths'
import { DeprecationChecker } from './DeprecationChecker/DeprecationChecker'
import { OutdatedChecker } from './OutdatedChecker/OutdatedChecker'
import { EnvVariablesConstants } from '../lib/constants/EnvVariables'

export class CLIPreTasks {
  public static readonly PRETASKS_LOCAL_DIR = PathConstants.PRETASKS_FOLDER

  public static getCLIPreTasks(pkgJson: any) {
    return new CLIPreTasks(pkgJson)
  }

  constructor(private pkg: any) {}

  private ensureCompatibleNode() {
    const nodeVersion = process.version
    if (semver.satisfies(nodeVersion, this.pkg.engines.node)) {
      return
    }

    const minMajor = this.pkg.engines.node.replace('>=', '')
    const errMsg = chalk.bold(
      `Incompatible with node < v${minMajor}. Please upgrade node to major ${minMajor} or higher.`
    )

    console.error(errMsg)
    process.exit(1)
  }

  private removeOutdatedPaths() {
    // TODO: Add metrics to check for outdated paths
    const outdatedPaths = {
      telemetryPath: join(configDir, 'vtex', 'telemetry'),
      cliPreChecker: join(configDir, 'vtex', 'prechecks'),
      oldVtexFolder: join(configDir, 'vtex'),
      telemetryStore: join(configDir, 'vtex-telemetry-store.json'),
      deprecationStore: join(configDir, 'deprecation-checking.json'),
    }

    Object.keys(outdatedPaths).forEach(pathKey => {
      if (pathExistsSync(outdatedPaths[pathKey])) {
        removeSync(outdatedPaths[pathKey])
      }
    })
  }

  public runTasks() {
    if (process.env[EnvVariablesConstants.IGNORE_CLIPRETASKS]) {
      return
    }

    this.ensureCompatibleNode()
    this.removeOutdatedPaths()
    DeprecationChecker.checkForDeprecation(CLIPreTasks.PRETASKS_LOCAL_DIR, this.pkg)
    OutdatedChecker.checkForOutdate(CLIPreTasks.PRETASKS_LOCAL_DIR, this.pkg)
  }
}
