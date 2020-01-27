import chalk from 'chalk'
import * as semver from 'semver'
import * as pkg from '../package.json'
import { NpmClient } from './clients/npmClient.js'

export class CLIPrechecker {
  private static ensureCompatibleNode() {
    const nodeVersion = process.version
    if (!semver.satisfies(nodeVersion, pkg.engines.node)) {
      const minMajor = pkg.engines.node.replace('>=', '')
      console.error(
        chalk.bold(`Incompatible with node < v${minMajor}. Please upgrade node to major ${minMajor} or higher.`)
      )

      process.exit(1)
    }
  }

  private static async ensureNotDeprecated() {
    const { deprecated } = await NpmClient.getPackageMetadata(pkg.name, pkg.version)
    if (deprecated != null) {
      console.error(
        chalk.bold(
          `This version ${pkg.version} was deprecated. Please update to the latest version: ${chalk.green(
            'yarn global add vtex'
          )}.`
        )
      )

      process.exit(1)
    }
  }

  public static async runChecks() {
    this.ensureCompatibleNode()
    await this.ensureNotDeprecated()
  }
}
