import { parse as parseYarnLock } from '@yarnpkg/lockfile'
import { pathExists, readFile, readJson, writeJson, writeJsonSync } from 'fs-extra'
import { dirname, join, resolve } from 'path'
import semver from 'semver'

export interface PackageJsonInterface {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const isRangeVersion = (version: string) => {
  return semver.validRange(version) && !semver.valid(version)
}

export class PackageJson {
  static versionSatisfiesWithYarnPriority(versionRequired: string, versionFound: string, yarnResolvedVersion: string) {
    if (!semver.valid(versionFound) && !semver.validRange(versionFound)) {
      return false
    }

    if (!yarnResolvedVersion) {
      return versionRequired === versionFound
    }

    if (isRangeVersion(versionRequired)) {
      if (isRangeVersion(versionFound)) {
        return semver.satisfies(yarnResolvedVersion, versionRequired)
      } else {
        return semver.satisfies(versionFound, versionRequired)
      }
    } else {
      return versionRequired === versionFound
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

  private static async readAndParseYarnLock(yarnLockPath: string) {
    const content = await readFile(yarnLockPath, 'utf8')
    return parseYarnLock(content)
  }

  content: PackageJsonInterface
  yarnLock: ReturnType<typeof parseYarnLock>
  constructor(public packageJsonPath: string, private notifier?: any) {}

  public async init() {
    this.content = await readJson(this.packageJsonPath)
    const yarnLockPath = join(dirname(this.packageJsonPath), 'yarn.lock')

    if (await pathExists(yarnLockPath)) {
      this.yarnLock = await PackageJson.readAndParseYarnLock(yarnLockPath)
    }
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

  private getYarnResolvedVersion(depType: string, depName: string): string | undefined {
    const depVersionLocator = this.content[depType][depName]
    const yarnDepLocator = `${depName}@${depVersionLocator}`
    return this.yarnLock?.object?.[yarnDepLocator]?.version
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
      !PackageJson.versionSatisfiesWithYarnPriority(
        depVersion,
        this.content[depType][depName],
        this.getYarnResolvedVersion(depType, depName)
      )
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
