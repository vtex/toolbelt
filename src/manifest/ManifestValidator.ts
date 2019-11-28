import { CommandError } from '../errors'

export class ManifestValidator {
  public static readonly namePattern = '[\\w_-]+'
  public static readonly vendorPattern = '[\\w_-]+'
  public static readonly versionPattern = '\\d+\\.\\d+\\.\\d+(-.*)?'
  public static readonly wildVersionPattern = '\\d+\\.((\\d+\\.\\d+)|(\\d+\\.x)|x)(-.*)?'
  
  public static readonly appName = new RegExp(`^${ManifestValidator.vendorPattern}\\.${ManifestValidator.namePattern}$`)
  public static readonly appLocator = new RegExp(
    `^${ManifestValidator.vendorPattern}\\.${ManifestValidator.namePattern}(?:@${ManifestValidator.wildVersionPattern})?$`
  )
  
  public static readonly dependencyName = new RegExp(`^(${ManifestValidator.vendorPattern}\\.|(infra):)${ManifestValidator.namePattern}(@${ManifestValidator.wildVersionPattern})?$`)
    

  public static validate(manifest: any) {
    const vendorRegex = new RegExp(`^${this.vendorPattern}$`)
    const nameRegex = new RegExp(`^${this.namePattern}$`)
    const versionRegex = new RegExp(`^${this.versionPattern}$`)
    if (manifest.name === undefined) {
      throw new CommandError("Field 'name' should be set in manifest.json file")
    }
    if (manifest.version === undefined) {
      throw new CommandError("Field 'version' should be set in manifest.json file")
    }
    if (manifest.vendor === undefined) {
      throw new CommandError("Field 'vendor' should be set in manifest.json file")
    }
    if (!nameRegex.test(manifest.name)) {
      throw new CommandError("Field 'name' may contain only letters, numbers, underscores and hyphens")
    }
    if (!vendorRegex.test(manifest.vendor)) {
      throw new CommandError("Field 'vendor' may contain only letters, numbers, underscores and hyphens")
    }
    if (!versionRegex.test(manifest.version)) {
      throw new CommandError('The version format is invalid')
    }
  }

  public static validateApp(app: string, skipVersion: boolean = false) {
    const regex = skipVersion ? this.appName : this.appLocator
    if (!regex.test(app)) {
      throw new CommandError(`Invalid app format, please use <vendor>.<name>${skipVersion ? '' : '[@<version>]'}`)
    }
    return app
  }
}
