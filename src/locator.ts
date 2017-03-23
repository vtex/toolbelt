export const toMajorLocator = (vendor: string, name: string, version: string): string => {
  const partialId = `${vendor}.${name}`
  const majorRange = `${version.split('.')[0]}.x`
  return `${partialId}@${majorRange}`
}

export const parseLocator = (locator: string): Manifest => {
  const [vendorAndName, version] = locator.split('@')
  const [vendor, name] = vendorAndName.split('.')
  return {vendor, name, version}
}
