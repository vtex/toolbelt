import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as Table from 'cli-table'

import log from '../../logger'
import {apps} from '../../clients'
import {parseLocator} from '../../locator'

const {listApps, listLinks} = apps

const renderTable = (apps, title: string, emptyMessage: string): void => {
  console.log(chalk.green(title))
  if (apps.length === 0) {
    return console.log(`${emptyMessage}\n`)
  }
  const table = new Table({head: ['Vendor', 'Name', 'Version']})
  apps.forEach(r => table.push([r.vendor, r.name, r.version]))
  console.log(`${table.toString()}\n`)
}

export default {
  description: 'List your installed VTEX apps',
  handler: () => {
    log.debug('Starting to list apps')
    return Promise.all([
      listApps().then(prop('data')).then(a => a.map(({app}) => parseLocator(app))),
      listLinks().then(linkedApps => linkedApps.map(parseLocator)),
    ])
    .spread((installedApps: Manifest[], linkedApps: Manifest[]) => {
      renderTable(installedApps, 'Installed Apps', 'You have no installed apps')
      renderTable(linkedApps, 'Linked Apps', 'You have no linked apps')
    })
  },
}
