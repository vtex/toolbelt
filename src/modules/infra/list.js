import semver from 'semver'
import chalk from 'chalk'
import log from '../../logger'
import Table from 'cli-table'
import {getAccount, getWorkspace} from '../../conf'
import {router} from '../../clients'
import {getLastStableAndPrerelease} from './util'

export default {
  optionalArgs: 'name',
  description: 'List installed services',
  options: [
    {
      short: 'a',
      long: 'available',
      description: 'List services available to install',
      type: 'bool',
    }, {
      short: 'f',
      long: 'filter',
      description: 'Only list versions containing this word',
      type: 'string',
    },
  ],
  handler: async function (name, options) {
    if (options.a) {
      if (name) {
        await printAvailableServiceVersions(name, options.f)
      } else {
        await printAvailableServices()
      }
    } else {
      await printInstalledServices()
    }
  },
}

async function printAvailableServices () {
  const srv = await router().listAvailableServices()
  const table = new Table({
    head: ['Name', 'Last stable', 'Last prerelease'],
  })
  for (let k in srv) {
    const [stable, prerelease] = getLastStableAndPrerelease(srv[k])
    table.push([chalk.bold.cyan(k), chalk.bold.green(stable), chalk.yellow(prerelease)])
  }
  log.info('Available services')
  console.log(table.toString())
}

async function printAvailableServiceVersions (name, filter) {
  const srv = await router().getAvailableVersions(name)
  log.info(`Available versions of ${chalk.bold.cyan(name)} (last 20)`)
  const region = Object.keys(srv.versions)[0]
  srv.versions[region]
    .filter(v => !filter || v.indexOf(filter) >= 0)
    .map(semver.valid)
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
}

async function printInstalledServices () {
  const account = getAccount()
  const workspace = getWorkspace()
  const table = new Table({
    head: ['Name', 'Version'],
  })
  const res = await router().listInstalledServices(account, workspace)
  for (let service of res) {
    const version = semver.valid(service.version)
    const styledVersion = semver.prerelease(version) !== null
      ? chalk.yellow(version)
      : chalk.bold.green(version)
    table.push([
      chalk.bold.cyan(service.name),
      styledVersion,
    ])
  }
  log.info(`Services installed on ${chalk.cyan(account)}/${chalk.cyan(workspace)}`)
  console.log(table.toString())
}
