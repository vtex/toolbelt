import * as chalk from 'chalk'
import * as semver from 'semver'
import * as Table from 'cli-table'
import * as Bluebird from 'bluebird'
import {contains} from 'ramda'

import log from '../../logger'
import {router} from '../../clients'

const {listAvailableIoVersions, getInstalledIoVersion} = router

const listAllAvailableIoVersions = (): Bluebird<void> =>
  listAvailableIoVersions()
    .then((availableIoVersions: IoVersions[]) => {
      const allServicesKeys = ["Version"];
      const rows = [];
      availableIoVersions.forEach(({version, tested, services}) => {
        const validVersion = semver.valid(version)
        const styledVersion = tested ? chalk.green(validVersion) : chalk.bold.yellow(validVersion)
        const serviceKeys = Object.keys(services)
        const row = [styledVersion];
        serviceKeys.forEach(serviceKey => {
          if(!contains(serviceKey, allServicesKeys))
            allServicesKeys.push(serviceKey)
          const index = allServicesKeys.indexOf(serviceKey)
          const version = services[serviceKey];
          row[index] = version
        })
        rows.push(row)
      })
      const table = new Table({head: allServicesKeys})
      rows.forEach(item => {
        table.push(item);
      })
      return table
    })
    .then(table => {
      log.info(`io versions available to install`)
      console.log(table.toString())
    })

const printInstalledIoVersion = (): Bluebird<void> =>
  getInstalledIoVersion()
    .then((installed: IoVersions) => {

        const allServicesKeys = ["Version"];
        const validVersion = semver.valid(installed.version)
        const styledVersion = installed.tested ? chalk.green(validVersion) : chalk.bold.yellow(validVersion)
        const serviceKeys = Object.keys(installed.services)
        const row = [styledVersion];
        serviceKeys.forEach(serviceKey => {
          if(!contains(serviceKey, allServicesKeys))
            allServicesKeys.push(serviceKey)
          const index = allServicesKeys.indexOf(serviceKey)
          const version = installed.services[serviceKey];
          row[index] = version
        })
        const table = new Table({head: allServicesKeys})
        table.push(row)
        return table
    })
    .then(table => {
      log.info(`io versions available to install`)
      console.log(table.toString())
    })

export default {
  description: 'List Io versions available to install',
  options: [
    {
      short: 'a',
      long: 'available',
      description: 'List services available to install',
      type: 'bool',
    }
  ],
  handler: (options) => {
    const available = options.a || options.available
    return available ? listAllAvailableIoVersions() : printInstalledIoVersion();
  },
}
