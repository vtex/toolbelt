import { createFlowIssueError } from '../error'

const namePattern = '[\\w_-]+'
const vendorPattern = '[\\w_-]+'
const versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
const wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
const majorVersionLocatorPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
const appID = new RegExp(`^${vendorPattern}\\.${namePattern}$`)
const dependencyName = new RegExp(`^(${vendorPattern}\\.|(infra):)${namePattern}(@${wildVersionPattern})?$`)
const appLocator = new RegExp(`^${vendorPattern}\\.${namePattern}(?:@${wildVersionPattern})?$`)

export class ManifestValidator {
  public static readonly namePattern = namePattern
  public static readonly vendorPattern = vendorPattern
  public static readonly versionPattern = versionPattern
  public static readonly wildVersionPattern = wildVersionPattern
  public static readonly majorVersionLocatorPattern = majorVersionLocatorPattern
  public static readonly appID = appID
  public static readonly dependencyName = dependencyName
  public static readonly appLocator = appLocator

  public static validate(manifest: any) {
    const vendorRegex = new RegExp(`^${this.vendorPattern}$`)
    const nameRegex = new RegExp(`^${this.namePattern}$`)
    const versionRegex = new RegExp(`^${this.versionPattern}$`)
    if (manifest.name === undefined) {
      throw createFlowIssueError("Field 'name' should be set in manifest.json file")
    }
    if (manifest.version === undefined) {
      throw createFlowIssueError("Field 'version' should be set in manifest.json file")
    }
    if (manifest.vendor === undefined) {
      throw createFlowIssueError("Field 'vendor' should be set in manifest.json file")
    }
    if (!nameRegex.test(manifest.name)) {
      throw createFlowIssueError("Field 'name' may contain only letters, numbers, underscores and hyphens")
    }
    if (!vendorRegex.test(manifest.vendor)) {
      throw createFlowIssueError("Field 'vendor' may contain only letters, numbers, underscores and hyphens")
    }
    if (!versionRegex.test(manifest.version)) {
      throw createFlowIssueError('The version format is invalid')
    }
  }

  public static validateApp(app: string, skipVersion = false) {
    const regex = skipVersion ? ManifestValidator.appID : ManifestValidator.appLocator
    if (!regex.test(app)) {
      throw createFlowIssueError(`Invalid app format, please use <vendor>.<name>${skipVersion ? '' : '[@<version>]'}`)
    }
    return app
  }
}
