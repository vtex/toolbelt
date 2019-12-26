import { pathExists, readJson, writeJson, writeJsonSync } from 'fs-extra'
import { resolve } from 'path'
import * as semver from 'semver'

export interface PackageJsonInterface {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export class PackageJson {
  static versionSatisfiesWithUserPriority(versionRequired: string, versionFound: string) {
    if (!semver.valid(versionFound) && !semver.validRange(versionFound)) {
      return false
    }

    if (semver.validRange(versionRequired)) {
      if (semver.validRange(versionFound)) {
        const minFoundVersion = semver.minVersion(versionFound)
        return semver.satisfies(minFoundVersion, versionRequired)
      } else {
        return semver.satisfies(versionFound, versionRequired)
      }
    } else {
      return versionRequired !== versionFound
    }
  }

  static async getBuilderPackageJsonIfExists(
    appRoot: string,
    builder: string,
    notifyIfDoesntExist: boolean,
    notifier?: any
  ): Promise<PackageJson | null> {
    const path = resolve(appRoot, builder, 'package.json')
    if (!(await pathExists(path))) {
      if (notifyIfDoesntExist) {
        notifier.warn(`Folder ${builder} doesn't have a package.json`)
      }

      return null
    }

    const pkg = new PackageJson(path, notifier)
    await pkg.init()
    return pkg
  }

  content: PackageJsonInterface
  constructor(public packageJsonPath: string, private notifier?: any) {}

  public async init() {
    this.content = await readJson(this.packageJsonPath)
  }

  get name() {
    return this.content.name ?? ''
  }

  get version() {
    return this.content.version ?? ''
  }

  get dependencies() {
    return this.content.dependencies ?? {}
  }

  get devDependencies() {
    return this.content.devDependencies ?? {}
  }

  public flushChanges() {
    return writeJson(this.packageJsonPath, this.content, { spaces: 2 })
  }

  public flushChangesSync() {
    return writeJsonSync(this.packageJsonPath, this.content, { spaces: 2 })
  }

  public changeDepVersionIfUnsatisfied(depName: string, depVersion: string) {
    this.maybeChangeDepVersionByDepType(depName, depVersion, 'dependencies')
    this.maybeChangeDepVersionByDepType(depName, depVersion, 'devDependencies')
  }

  public maybeChangeDepVersionByDepType(
    depName: string,
    depVersion: string,
    depType: 'dependencies' | 'devDependencies'
  ) {
    if (
      this.content[depType]?.[depName] != null &&
      !PackageJson.versionSatisfiesWithUserPriority(depVersion, this.content[depType][depName])
    ) {
      this.notifier?.warn(`Changing ${depName} on ${depType} from ${this.content[depType][depName]} to ${depVersion}`)
      this.content[depType][depName] = depVersion
    }
  }

  public addDependency(depName: string, depVersionOrUrl: string, depType: 'dependencies' | 'devDependencies') {
    this.content[depType] = {
      ...this.content[depType],
      [depName]: depVersionOrUrl,
    }
  }
}
