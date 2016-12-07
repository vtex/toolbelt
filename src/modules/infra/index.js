import axios from 'axios'
import chalk from 'chalk'
import semver from 'semver'
import Table from 'cli-table'
import log from '../../logger'
import {getAccount, getWorkspace} from '../../conf'

const http = axios.create({
  baseURL: 'http://router.aws-us-east-1.vtex.io',
})

export default {
  infra: {
    ls: {
      optionalArgs: 'name',
      description: 'List installed services',
      options: [
        {
          short: 'a',
          long: 'available',
          description: 'List services available to install',
          type: 'bool',
        },
      ],
      handler: async function (name, options) {
        if (options.a) {
          if (name) {
            await printAvailableServiceVersions(name)
          } else {
            await printAvailableServices()
          }
        } else {
          await printInstalledServices()
        }
      },
    },
    install: {
      description: 'Install a service',
      handler: function () {

      },
    },
  },
}

async function printAvailableServices () {
  const srv = await http.get('/_services')
  const table = new Table({
    head: ['Name', 'Last stable', 'Last prerelease'],
  })
  for (let k in srv.data) {
    const [stable, prerelease] = getLastStableAndPrerelease(srv.data[k])
    table.push([chalk.bold.cyan(k), chalk.bold.green(stable), chalk.yellow(prerelease)])
  }
  log.info('Available services')
  console.log(table.toString())
}

async function printAvailableServiceVersions (name) {
  const srv = await http.get('/_services/' + name)
  log.info(`Available versions of ${chalk.bold.cyan(name)} (last 20)`)
  const region = Object.keys(srv.data.versions)[0]
  const versions = srv.data.versions[region]
    .map(semver.valid)
    .filter(v => v !== null)
    .slice(0, 20)
  for (let v of versions) {
    if (semver.prerelease(v) !== null) {
      console.log(`  ${chalk.yellow(v)}`)
    } else {
      console.log(`  ${chalk.bold.green(v)}`)
    }
  }
}

async function printInstalledServices () {
  const account = getAccount()
  const workspace = getWorkspace()
  const res = await http.get(`/${account}/${workspace}/services`)
  const table = new Table({
    head: ['Name', 'Version'],
  })
  for (let service of res.data) {
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

function getLastStableAndPrerelease (service) {
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
