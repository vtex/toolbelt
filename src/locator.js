export function locatorByMajor (locator) {
  const versionIndex = locator.indexOf('@')
  const majorIndex = versionIndex + 2
  const hasVersion = /\d/.test(locator[majorIndex])
  if (versionIndex > -1 && hasVersion) {
    return locator.substring(0, majorIndex)
  }
  return locator
}
