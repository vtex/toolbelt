import semver from 'semver'
import chalk from 'chalk'

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

export function getTag (version: string): string {
  const segments = semver.prerelease(version)
  return segments ? segments[0] : null
}

export function diffVersions (a, b) {
  a = semver(a)
  b = semver(b)

  let [aMain, bMain] = diff([a.major, a.minor, a.patch], [b.major, b.minor, b.patch])
  let [aPre, bPre] = diff(a.prerelease, b.prerelease)

  return [
    stitch(aMain, aPre),
    stitch(bMain, bPre),
  ]
}

const stitch = (main, prerelease) =>
  prerelease.length > 0 ? main + '-' + prerelease : main

const diff = (a, b) => {
  let from = []
  let to = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let ai = a[i]
    let bi = b[i]
    if (ai !== bi) {
      if (ai !== undefined) {
        from.push(chalk.red(ai))
      }
      if (bi !== undefined) {
        to.push(chalk.green(bi))
      }
    } else {
      from.push(ai)
      to.push(bi)
    }
  }
  return [from.join('.'), to.join('.')]
}
