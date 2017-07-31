import * as ora from 'ora'
import * as chalk from 'chalk'
import * as semver from 'semver'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {curry, prop, path} from 'ramda'

import log from '../../logger'
import {router} from '../../clients'
import {getTag, diffVersions} from './utils'

const VERSIONS_REGION = 'aws-us-east-1'
const {getAvailableVersions, listInstalledServices, installService} = router

const promptInstall = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue with the installation?',
    })
    .then<boolean>(prop('confirm')),
  )

const findVersion = (pool: string[], predicate: (version: string) => boolean): string =>
  pool.filter(v => semver.valid(v))
    .filter(predicate)
    .sort(semver.rcompare)
    .shift()

const getNewVersion = curry<string, string, string[], [string, string]>(
  (suffix: string, installedVersion: string, availableVersions: string[]): [string, string] => {
    const tag = getTag(installedVersion)
    const hasValidSuffix = semver.valid(suffix)
    const hasSuffixAndValidSuffix = suffix && hasValidSuffix
    const hasSuffixOnAvailable = availableVersions.find(v => v === suffix)

    if (hasSuffixAndValidSuffix && hasSuffixOnAvailable) {
      return [installedVersion, suffix]
    } else if (hasSuffixAndValidSuffix && !hasSuffixOnAvailable) {
      return [installedVersion, null]
    }

    const hasValidRange = semver.validRange(suffix, true)
    const hasTagOrInstalledVersion = !tag || !installedVersion
    const fn = hasValidRange ? v => semver.satisfies(v, suffix, true)
      : suffix && !hasValidSuffix ? v => getTag(v) === null
      : hasTagOrInstalledVersion ? v => semver.prerelease(v) === null
      : v => getTag(v) === tag
    const newVersion = findVersion(availableVersions, fn)
    return [installedVersion, newVersion]
  },
)

const logInstall = curry<string, [string, string], void>(
  (name: string, [installedVersion, newVersion]: [string, string]): void => {
    if (!newVersion) {
      log.error(`No suitable version for ${name}`)
      return
    } else if (newVersion === installedVersion) {
      console.log(`${name}  ${chalk.yellow(installedVersion)}`)
      log.info('Service is up to date.')
      return
    } else if (installedVersion) {
      const [from, to] = diffVersions(installedVersion, newVersion)
      return console.log(`${name}  ${from} ${chalk.gray('->')} ${to}`)
    }
    return console.log(`${name}  ${chalk.green(newVersion)}`)
  },
)

const hasNewVersion = ([installedVersion, newVersion]: [string, string]): boolean =>
  !!(newVersion && (newVersion !== installedVersion))

const getInstalledVersion = (service: string): Bluebird<string> =>
  listInstalledServices()
    .then(data => data.find(({name}) => name === service))
    .then(s => s && s.version)

export default (name: string) => {
  const [service, suffix] = name.split('@')
  const spinner = ora('Getting versions').start()
  return Promise.all([
    getInstalledVersion(service),
    getAvailableVersions(service).then(path(['versions', VERSIONS_REGION])),
  ])
  .tap(() => spinner.stop())
  .spread(getNewVersion(suffix))
  .tap(logInstall(service))
  .then((versions: [string, string]) => {
    return hasNewVersion(versions)
      ? Promise.resolve(console.log(''))
          .then(promptInstall)
          .then(confirm => {
            if (!confirm) {
              return
            }
            spinner.text = 'Installing'
            spinner.start()
            return installService(service, versions[1])
          })
          .then(() => {
            spinner.stop()
            log.info('Installation complete')
          })
      : null
  })
  .catch(err => {
    spinner.stop()
    throw err
  })
}
