export function toLocator (vendor, name, version) { return `${vendor}.${name}@${version}` }

export function toMajorLocator (vendor, name, version) {
  const partialId = `${vendor}.${name}`
  const majorRange = `${version.split('.')[0]}.x`
  return `${partialId}@${majorRange}`
}

export function locatorByMajor (locator) {
  const versionIndex = locator.indexOf('@')
  const majorIndex = versionIndex + 2
  const hasVersion = /\d/.test(locator[majorIndex])
  if (versionIndex > -1 && hasVersion) {
    return locator.substring(0, majorIndex)
  }
  return locator
}

export function parseLocator (locator) {
  const [vendorAndName, version] = locator.split('@')
  const [vendor, name] = vendorAndName.split('.')
  return {vendor, name, version}
}
