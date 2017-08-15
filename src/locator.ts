export const toMajorRange = (version: string): string => {
  return `${version.split('.')[0]}.x`
}

export const toMajorLocator = (vendor: string, name: string, version: string): string => {
  const majorRange = toMajorRange(version)
  return `${vendor}.${name}@${majorRange}`
}

export const toAppLocator = (manifest: Manifest): string => {
  return `${manifest.vendor}.${manifest.name}@${manifest.version}`
}

export const parseLocator = (locator: string): Manifest => {
  const [vendorAndName, version] = locator.split('@')
  const [vendor, name] = vendorAndName.split('.')
  return {vendor, name, version}
}
