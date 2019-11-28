import { ManifestValidator } from './manifest/ManifestValidator'

export class App {
  public static readonly appID = new RegExp(`^${ManifestValidator.vendorPattern}\\.${ManifestValidator.namePattern}$`)
  public static readonly dependencyName = new RegExp(
    `^(${ManifestValidator.vendorPattern}\\.|(infra):)${ManifestValidator.namePattern}(@${ManifestValidator.wildVersionPattern})?$`
  )
  public static readonly appLocator = new RegExp(
    `^${ManifestValidator.vendorPattern}\\.${ManifestValidator.namePattern}(?:@${ManifestValidator.wildVersionPattern})?$`
  )

  public readonly name: string
  public readonly vendor: string
  public readonly version: string
  public readonly isLinked: boolean
  public readonly isInfra: boolean

  constructor(appId: string)
  constructor(appNameWithVendor: string, version: string)
  constructor(vendor: string, appName: string, version: string)
  constructor(arg1: string, arg2?: string, arg3?: string) {
    if (arg3) {
      this.vendor = arg1
      this.name = arg2
      this.version = arg3
    } else if (arg2) {
      ;[this.vendor, this.name] = arg1.split('.')
      this.version = arg2
    } else {
      let appId: string
      ;[appId, this.version] = arg1.split('@')
      ;[this.vendor, this.name] = appId.split('.')
    }

    this.isInfra = this.name.startsWith('infra:')
    this.isLinked = this.version.includes('+build')
  }

  public get allAppVersions() {
    return []
  }
}
