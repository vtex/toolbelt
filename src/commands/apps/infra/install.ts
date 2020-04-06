import chalk from 'chalk'
import ora from 'ora'
import { curry, path } from 'ramda'
import semver from 'semver'

import log from '../../../logger'
import { CustomCommand } from '../../../lib/CustomCommand'
import { router } from '../../../clients'
import { Region } from '../../../conf'
import { promptConfirm } from '../../../lib/prompts'
import { getTag, diffVersions } from '../../../lib/infra/utils'

const { getAvailableVersions, listInstalledServices, installService } = router

const promptInstall = () => Promise.resolve(promptConfirm('Continue with the installation?'))

const findVersion = (pool: string[], predicate: (version: string) => boolean): string =>
  pool
    .filter(v => semver.valid(v))
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
    }

    if (hasSuffixAndValidSuffix && !hasSuffixOnAvailable) {
      return [installedVersion, null]
    }

    const hasValidRange = semver.validRange(suffix, true)
    const hasTagOrInstalledVersion = !tag || !installedVersion
    const fn = hasValidRange
      ? v => semver.satisfies(v, suffix, true)
      : suffix && !hasValidSuffix
      ? v => getTag(v) === null
      : hasTagOrInstalledVersion
      ? v => semver.prerelease(v) === null
      : v => getTag(v) === tag
    const newVersion = findVersion(availableVersions, fn)
    return [installedVersion, newVersion]
  }
)

const logInstall = curry<string, [string, string], void>(
  (name: string, [installedVersion, newVersion]: [string, string]): void => {
    if (!newVersion) {
      log.error(`No suitable version for ${name}`)
      return
    }

    if (newVersion === installedVersion) {
      console.log(`${name}  ${chalk.yellow(installedVersion)}`)
      log.info('Service is up to date.')
      return
    }

    if (installedVersion) {
      const [from, to] = diffVersions(installedVersion, newVersion)
      return console.log(`${name}  ${from} ${chalk.gray('->')} ${to}`)
    }

    return console.log(`${name}  ${chalk.green(newVersion)}`)
  }
)

const hasNewVersion = ([installedVersion, newVersion]: [string, string]): boolean =>
  !!(newVersion && newVersion !== installedVersion)

const getInstalledVersion = (service: string) =>
  listInstalledServices()
    .then(data => data.find(({ name }) => name === service))
    .then(s => s?.version)

export default class InfraInstall extends CustomCommand {
  static description = 'Install a service'

  static examples = []

  static flags = {}

  static args = [{ name: 'serviceId', required: true }]

  async run() {
    const { args } = this.parse(InfraInstall)
    const name = args.serviceId

    const [service, suffix] = name.split('@')
    const spinner = ora('Getting versions').start()

    try {
      const allVersions = (await Promise.all([
        getInstalledVersion(service),
        getAvailableVersions(service).then(path(['versions', Region.Production])),
      ])) as [string, string[]]

      spinner.stop()
      const newVersions: [string, string] = getNewVersion(suffix)(...allVersions)
      logInstall(service)(newVersions)
      if (!hasNewVersion(newVersions)) {
        return null
      }

      await Promise.resolve(console.log(''))
        .then(promptInstall)
        .then(confirm => {
          if (!confirm) {
            return
          }
          spinner.text = 'Installing'
          spinner.start()
          return installService(service, newVersions[1])
        })
        .then(() => {
          spinner.stop()
          log.info('Installation complete')
        })
    } catch (err) {
      spinner.stop()
      throw err
    }
  }
}
