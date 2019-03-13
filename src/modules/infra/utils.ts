import chalk from 'chalk'
import * as R from 'ramda'
import * as semver from 'semver'

const stitch = (main: string, prerelease: string): string =>
  prerelease.length > 0 ? `${main}-${prerelease}` : main

const diff = (a: string | string[], b: string | string[]): string[] => {
  const from = []
  const to = []
  let fromFormatter = x => x
  let toFormatter = x => x
  R.compose(
    R.map(
      ([aDigit, bDigit]) => {
        if (aDigit !== bDigit) {
          fromFormatter = x => chalk.red(x)
          toFormatter = x => chalk.green(x)
        }
        from.push(fromFormatter(aDigit))
        to.push(toFormatter(bDigit))
      }
    ),
    R.zip)(a, b)
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
    [semverB.major, semverB.minor, semverB.patch]
  )
  const [aPre, bPre] = diff(semverA.prerelease, semverB.prerelease)
  return [stitch(aMain, aPre), stitch(bMain, bPre)]
}
