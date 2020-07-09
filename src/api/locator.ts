export const versionMajor = (version: string): string => {
  return version.split('.', 2)[0]
}

export const toMajorRange = (version: string): string => {
  return `${versionMajor(version)}.x`
}

export const toAppLocator = ({ vendor, name, version }: Manifest): string => {
  return `${vendor}.${name}@${version}`
}

export const parseLocator = (locator: string): Manifest => {
  const [vendorAndName, version] = locator.split('@')
  const [vendor, name] = vendorAndName.split('.')
  return { vendor, name, version, builders: {} }
}

export const removeVersion = (appId: string): string => appId.split('@', 2)[0]
