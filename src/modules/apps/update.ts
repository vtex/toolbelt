import * as Bluebird from 'bluebird'
import * as Table from 'cli-table'
import * as inquirer from 'inquirer'
import * as ora from 'ora'
import { isEmpty, map, pipe, prop, reject } from 'ramda'

import { apps } from '../../clients'
import { parseLocator, toAppLocator } from '../../locator'
import log from '../../logger'
import { diffVersions } from '../infra/utils'
import { prepareInstall } from './install'
import { appsLastVersion } from './utils'

const { listApps } = apps

const promptUpdate = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      message: 'Apply version updates?',
      name: 'confirm',
      type: 'confirm',
    })
      .then<boolean>(prop('confirm')),
  )

const sameVersion = ({ version, latest }: Manifest) => version === latest
const updateVersion = (app) => {
  app.version = app.latest
  return app
}

export default async () => {
  const spinner = ora('Getting available updates').start()
  const { data } = await listApps()
  const installedApps = map(pipe(prop('app'), parseLocator), data)
  const withLatest = await Bluebird.all(map(async (app) => {
    app.latest = await appsLastVersion(`${app.vendor}.${app.name}`)
    return app
  }, installedApps))
  const updateableApps = reject(sameVersion, withLatest)

  const table = new Table({ head: ['Vendor', 'Name', 'Current', 'Latest'] })
  updateableApps.forEach(({ vendor, name, version, latest }) => {
    if (!latest) {
      log.debug(`Couldn't find latest version of ${vendor}.${name}`)
      return
    }
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
  await prepareInstall(appsList, 'smartcheckout')
}
