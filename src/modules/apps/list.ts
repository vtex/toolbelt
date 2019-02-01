import chalk from 'chalk'
import * as Table from 'cli-table'
import { compose, flip, gt, head, length, map, prop, split } from 'ramda'

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
  ({ title, emptyMessage, short, appArray }: {
    title: string,
    emptyMessage: string,
    short: boolean,
    appArray: any,
  }): void => {
    console.log(title)
    if (appArray.length === 0) {
      return console.log(`${emptyMessage}\n`)
    }
    const table = new Table({
      head: !short && ['Vendor', 'Name', 'Version', 'Linked'],
      ...(short && {
        chars: {
          'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
          'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
          'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
          'right': '' , 'right-mid': '' , 'middle': '   ',
        },
        style: { 'padding-left': 0, 'padding-right': 0 },
      }),
    })

    appArray.forEach(({ vendor, name, version }) => {
      const linkedLabel = short
        ? isLinked(version) ? chalk.green('linked') : 'not linked'
        : isLinked(version) ? chalk.green('yes') : 'no'

      const cleanedVersion = cleanVersion(version)

      table.push(short
        ? [`${chalk.gray(vendor)}.${name}`, cleanedVersion, linkedLabel]
        : [vendor, name, cleanedVersion, linkedLabel]
      )
    })

    console.log(`${table.toString()}\n`)
  }
)

export default ({ s, short }) => {
  const account = getAccount()
  const workspace = getWorkspace()
  log.debug('Starting to list apps')
  return listApps()
    .then(prop('data'))
    .then(parseLocatorFromList)
    .then(appArray => renderTable({
      title: `${chalk.green('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.green(workspace)}`,
      emptyMessage: 'You have no installed apps',
      short: !!(s || short),
      appArray,
    }))
}
