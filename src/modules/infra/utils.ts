import chalk from 'chalk'
import * as semver from 'semver'

const stitch = (main: string, prerelease: string): string =>
  prerelease.length > 0 ? `${main}-${prerelease}` : main

const diff = (a: string | string[], b: string | string[]): string[] => {
  const from = []
  const to = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i]
    const bi = b[i]
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

export const getLastStableAndPrerelease = (service: InfraResourceVersions): [string, string] => {
  const region = Object.keys(service.versions)[0]
  const versions = service.versions[region]
    .map<string>(semver.valid)
    .filter(v => v !== null)
    .sort(semver.compare)
    .reverse()
  const prerelease = versions.find(v => semver.prerelease(v) !== null) || '-'
  const stable = versions.find(v => semver.prerelease(v) === null) || '-'
  return [stable, prerelease]
}

export const getTag = (version: string): string => {
  const segments = semver.prerelease(version)
  return segments ? segments[0] : null
}

export const diffVersions = (a: string, b: string): [string, string] => {
  const semverA = semver(a)
  const semverB = semver(b)
  const [aMain, bMain] = diff(
    [semverA.major, semverA.minor, semverA.patch],
    [semverB.major, semverB.minor, semverB.patch],
  )
  const [aPre, bPre] = diff(semverA.prerelease, semverB.prerelease)
  return [stitch(aMain, aPre), stitch(bMain, bPre)]
}
