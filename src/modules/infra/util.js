import semver from 'semver'

export function getLastStableAndPrerelease (service) {
  const region = Object.keys(service.versions)[0]
  const versions = service.versions[region]
    .map(semver.valid)
    .filter(v => v !== null)
    .sort(semver.compare)
    .reverse()
  const prerelease = versions.find(v => semver.prerelease(v) !== null) || ''
  const stable = versions.find(v => semver.prerelease(v) === null) || ''
  return [stable, prerelease]
}
