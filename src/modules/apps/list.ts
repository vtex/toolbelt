import chalk from 'chalk'
import { compose, flip, gt, head, length, map, prop, split } from 'ramda'

import { createTable } from '../../table'
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

const renderTable = (
  ({ title, emptyMessage, appArray }: {
    title: string,
    emptyMessage: string,
    appArray: any,
  }): void => {
    console.log(title)

    if (appArray.length === 0) {
      return console.log(`${emptyMessage}\n`)
    }

    const table = createTable()

    appArray.forEach(({ vendor, name, version }) => {
      const linkedLabel = isLinked(version) ? chalk.green('linked') : 'not linked'

      const cleanedVersion = cleanVersion(version)

      const formattedAppName = `${chalk.blue(vendor)}${chalk.gray('.')}${name}`

      table.push([formattedAppName, cleanedVersion, linkedLabel])
    })

    console.log(`${table.toString()}\n`)
  }
)

export default () => {
  const account = getAccount()
  const workspace = getWorkspace()
  log.debug('Starting to list apps')
  return listApps()
    .then(prop('data'))
    .then(parseLocatorFromList)
    .then(appArray => renderTable({
      title: `${chalk.green('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.green(workspace)}`,
      emptyMessage: 'You have no installed apps',
      appArray,
    }))
}
