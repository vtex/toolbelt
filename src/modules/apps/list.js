import chalk from 'chalk'
import {prop} from 'ramda'
import Table from 'cli-table'
import log from '../../logger'
import {appEngineClient} from './utils'
import {getAccount, getWorkspace} from '../../conf'
import {parseLocator} from '../../locator'

function renderTable (apps, title, emptyMessage) {
  console.log(chalk.green(title))
  if (apps.length === 0) {
    return console.log(`${emptyMessage}\n`)
  }
  const table = new Table({
    head: ['Vendor', 'Name', 'Version'],
  })
  apps.forEach(r => {
    table.push([
      r.vendor,
      r.name,
      r.version,
    ])
  })
  console.log(`${table.toString()}\n`)
}

export default {
  description: 'List your installed VTEX apps',
  handler: () => {
    log.debug('Starting to list apps')
    return Promise.all([
      appEngineClient().listApps(
        getAccount(),
        getWorkspace()
      ).then(prop('data')),
      appEngineClient().listLinks(
        getAccount(),
        getWorkspace()
      ).then((linkedApps) => linkedApps.map(parseLocator)),
    ])
    .spread((installedApps, linkedApps) => {
      renderTable(installedApps.map(({app}) => parseLocator(app)), 'Installed Apps', 'You have no installed apps')
      renderTable(linkedApps, 'Linked Apps', 'You have no linked apps')
    })
  },
}
