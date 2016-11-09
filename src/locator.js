export function locatorByMajor (locator) {
  const versionIndex = locator.indexOf('@')
  return versionIndex > -1
    ? locator.substring(0, versionIndex + 2) : locator
}
