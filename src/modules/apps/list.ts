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

      const linked = isLinked(version)

      const coloredName = linked ? chalk.green(name) : name

      const linkedLabel = linked ? chalk.green(' (linked)') : ''

      const cleanedVersion = `${cleanVersion(version)}${linkedLabel}`

      const coloredVersion = linked ? chalk.green(cleanedVersion) : cleanedVersion

      const formattedName = `${chalk.blue(vendor)}${chalk.gray('.')}${coloredName}`

      table.push([formattedName, coloredVersion])
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
