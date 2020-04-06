import { AvailableServices, InstalledService } from '@vtex/api'
import { flags } from '@oclif/command'
import chalk from 'chalk'
import semver from 'semver'

import { createTable } from '../../../table'
import { router } from '../../../clients'
import { getAccount, getWorkspace } from '../../../conf'
import log from '../../../logger'
import { getLastStableAndPrerelease } from '../../../lib/infra/utils'
import { CustomCommand } from '../../../lib/CustomCommand'

const [account, workspace] = [getAccount(), getWorkspace()]
const { listAvailableServices, listInstalledServices, getAvailableVersions } = router

const printAvailableServices = () =>
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

const printAvailableServiceVersions = (name: string, filter: string) =>
  getAvailableVersions(name).then(({ versions }: InfraResourceVersions) => {
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

const printInstalledServices = () =>
  listInstalledServices()
    .then((installedRes: InstalledService[]) => {
      const table = createTable()
      installedRes.forEach(({ name, version }) => {
        const validVersion = semver.valid(version)
        const styledVersion =
          semver.prerelease(validVersion) !== null ? chalk.yellow(validVersion) : chalk.bold.green(validVersion)
        table.push([name, styledVersion])
      })
      return table
    })
    .then(table => {
      log.info(`Services installed on ${chalk.blue(account)}/${chalk.green(workspace)}`)
      console.log(table.toString())
    })


export default class InfraList extends CustomCommand {
  static description = 'List installed services'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
    filter: flags.string({ char: 'f', description: 'Only list versions containing this word' }),
    available: flags.boolean({ char: 'a', description: 'List services available to install' }),
  }

  static args = [{ name: 'name', required: false }]

  async run() {
    const { args, flags } = this.parse(InfraList)
    const name = args.name
    const filter = flags.filter
    const available = flags.available
    return available
      ? name
        ? printAvailableServiceVersions(name, filter)
        : printAvailableServices()
      : printInstalledServices()
  }
}
