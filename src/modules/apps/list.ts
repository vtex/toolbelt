import chalk from 'chalk'
import { compose, filter, flip, gt, head, length, map, not, prop, split } from 'ramda'

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

    appArray.forEach(({ vendor, name, version }) => {

      const cleanedVersion = cleanVersion(version)

      const formattedName = `${chalk.blue(vendor)}${chalk.gray.bold('.')}${name}`

      table.push([formattedName, cleanedVersion])
    })

    console.log(`${table.toString()}\n`)
  }
)

export default async () => {
  const account = getAccount()
  const workspace = getWorkspace()
  log.debug('Starting to list apps')
  const appArray = await listApps()
    .then(prop('data'))
    .then(parseLocatorFromList)
  renderTable({  // Installed apps
    title: `${chalk.yellow('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
    emptyMessage: 'You have no installed apps',
    appArray: filter(compose<any, string, boolean, boolean>(not, isLinked, prop('version')))(appArray),
  })
  renderTable({  // Linked apps
    title: `${chalk.yellow('Linked Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
    emptyMessage: 'You have no linked apps',
    appArray: filter(compose<any, string, boolean>(isLinked, prop('version')))(appArray),
  })
}
