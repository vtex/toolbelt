import { AvailableServices, InstalledService } from '@vtex/api'
import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as semver from 'semver'

import { createTable } from '../../table'
import { router } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'
import { getLastStableAndPrerelease } from './utils'

const [account, workspace] = [getAccount(), getWorkspace()]
const { listAvailableServices, listInstalledServices, getAvailableVersions } = router

const printAvailableServices = (): Bluebird<void> =>
  listAvailableServices()
    .then((availableRes: AvailableServices) => {
      const table = createTable({ head: ['Name', 'Last stable', 'Last prerelease'] })
      Object.keys(availableRes).forEach(res => {
        const [stable, prerelease] = getLastStableAndPrerelease(availableRes[res])
        table.push([res, chalk.bold.green(stable), chalk.yellow(prerelease)])
      })
      return table
    })
    .then(table => {
      log.info('Available services')
      console.log(table.toString())
    })

const printAvailableServiceVersions = (name: string, filter: string): Bluebird<void> =>
  getAvailableVersions(name)
    .then(({ versions }: InfraResourceVersions) => {
      const region = Object.keys(versions)[0]
      return versions[region]
        .filter(v => !filter || v.indexOf(filter) >= 0)
        .map<string>(semver.valid)
        .filter(v => v !== null)
        .sort(semver.compare)
        .reverse()
        .slice(0, 20)
        .forEach(v => {
          if (semver.prerelease(v) !== null) {
            console.log(`  ${chalk.yellow(v)}`)
          } else {
            console.log(`  ${chalk.bold.green(v)}`)
          }
        })
    })

const printInstalledServices = (): Bluebird<void> =>
  listInstalledServices()
    .then((installedRes: InstalledService[]) => {
      const table = createTable()
      installedRes.forEach(({ name, version }) => {
        const validVersion = semver.valid(version)
        const styledVersion = semver.prerelease(validVersion) !== null
          ? chalk.yellow(validVersion)
          : chalk.bold.green(validVersion)
        table.push([name, styledVersion])
      })
      return table
    })
    .then(table => {
      log.info(`Services installed on ${chalk.blue(account)}/${chalk.green(workspace)}`)
      console.log(table.toString())
    })

export default (name: string, options) => {
  const filter = options.f || options.filter
  const available = options.a || options.available
  return available
    ? (name ? printAvailableServiceVersions(name, filter) : printAvailableServices())
    : printInstalledServices()
}
