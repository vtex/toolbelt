import chalk from 'chalk'
import * as Table from 'cli-table'
import { compose, curry, flip, gt, head, length, map, prop, split } from 'ramda'

import { apps } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { parseLocator } from '../../locator'
import log from '../../logger'

const { listApps } = apps

const flippedGt = flip(gt)

const parseLocatorFromList =
  map(compose<any, string, Manifest>(parseLocator, prop('app')))

const cleanVersion =
  compose<string, string[], string>(head, split('+build'))

const isLinked =
  compose<string, string[], number, boolean>(flippedGt(1), length, split('+build'))

const renderTable = curry<string, string, any, void>(
  (title: string, emptyMessage: string, appArray): void => {
    console.log(title)
    if (appArray.length === 0) {
      return console.log(`${emptyMessage}\n`)
    }
    const table = new Table({ head: ['Vendor', 'Name', 'Version', 'Linked'] })
    appArray.forEach(({ vendor, name, version }) => {
      const linked = isLinked(version) ? chalk.green('yes') : 'no'
      const cleanedVersion = cleanVersion(version)
      table.push([vendor, name, cleanedVersion, linked])
    })
    console.log(`${table.toString()}\n`)
  },
)

export default () => {
  const account = getAccount()
  const workspace = getWorkspace()
  log.debug('Starting to list apps')
  return listApps()
    .then(prop('data'))
    .then(parseLocatorFromList)
    .then(renderTable(`${chalk.green('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.green(workspace)}`, 'You have no installed apps'))
}
