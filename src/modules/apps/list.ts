import chalk from 'chalk'
import { compose, flip, gt, head, length, map, prop, split, sortBy } from 'ramda'

import { apps } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { parseLocator } from '../../locator'
import log from '../../logger'
import { createTable } from '../../table'

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

    appArray = sortBy(compose(isLinked, prop('version')))(appArray)

    appArray.forEach(({ vendor, name, version }) => {

      const linked = isLinked(version)

      const coloredName = linked ? chalk.green(name) : name

      const linkedLabel = linked ? chalk.green(' (linked)') : ''

      const cleanedVersion = `${cleanVersion(version)}${linkedLabel}`

      const coloredVersion = linked ? chalk.green(cleanedVersion) : cleanedVersion

      const formattedName = `${chalk.blue(vendor)}${chalk.gray.bold('.')}${coloredName}`

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
      title: `${chalk.yellow('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
      emptyMessage: 'You have no installed apps',
      appArray,
    }))
}
