import * as ora from 'ora'
import * as Table from 'cli-table'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {map, prop, pipe, reject, isEmpty} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {installApps} from './install'
import {appsLastVersion} from './utils'
import {diffVersions} from '../infra/utils'
import {parseLocator, toAppLocator} from '../../locator'

const {listApps} = apps

const promptUpdate = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Apply version updates?',
    })
    .then<boolean>(prop('confirm')),
  )

const sameVersion = ({version, latest}: Manifest) => version === latest
const updateVersion = (app) => {
  app.version = app.latest
  return app
}

export default async () => {
  const spinner = ora('Getting available updates').start()
  const {data} = await listApps()
  const installedApps = map(pipe(prop('app'), parseLocator), data)
  const withLatest = await Bluebird.all(map(async (app) => {
    app.latest = await appsLastVersion(`${app.vendor}.${app.name}`)
    return app
  }, installedApps))
  const updateableApps = reject(sameVersion, withLatest)

  const table = new Table({head: ['Vendor', 'Name', 'Current', 'Latest']})
  updateableApps.forEach(({vendor, name, version, latest}) => {
    const [fromVersion, toVersion] = diffVersions(version, latest)
    table.push([vendor, name, fromVersion, toVersion])
  })
  spinner.stop()

  if (isEmpty(updateableApps)) {
    return log.info('No updates available for installed apps.')
  }

  console.log(`${table.toString()}\n`)

  const confirm = await promptUpdate()
  if (!confirm) {
    return
  }

  const appsList = map(pipe(updateVersion, toAppLocator), updateableApps)
  await installApps(appsList, 'smartcheckout')
}
