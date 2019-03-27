import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as ora from 'ora'
import { isEmpty, map, pipe, prop, reject } from 'ramda'

import { apps } from '../../clients'
import { parseLocator, toAppLocator } from '../../locator'
import log from '../../logger'
import { createTable } from '../../table'
import { diffVersions } from '../infra/utils'
import { promptConfirm } from '../utils'
import { prepareInstall } from './install'
import { appLatestVersion, isLinked } from './utils'

const { listApps } = apps

const promptUpdate = (): Bluebird<boolean> =>
  Promise.resolve(
    promptConfirm('Apply version updates?')
  )

const sameVersion = ({ version, latest }: Manifest) => version === latest

const extractAppLocator = pipe(prop('app'), parseLocator)

const updateVersion = (app) => {
  app.version = app.latest
  return app
}

export default async () => {
  const spinner = ora('Getting available updates').start()
  const { data } = await listApps()
  const installedApps = reject<Manifest>(isLinked, map(extractAppLocator, data))
  const withLatest = await Bluebird.all(map(async (app) => {
    app.latest = await appLatestVersion(`${app.vendor}.${app.name}`)
    return app
  }, installedApps))
  const updateableApps = reject(sameVersion, withLatest)

  const table = createTable({ head: ['App', 'Current', 'Latest'] })
  updateableApps.forEach(({ vendor, name, version, latest }) => {
    if (!latest) {
      log.debug(`Couldn't find latest version of ${vendor}.${name}`)
      return
    }
    const [fromVersion, toVersion] = diffVersions(version, latest)

    const formattedName = `${chalk.blue(vendor)}${chalk.gray.bold('.')}${name}`
    table.push([formattedName, fromVersion, toVersion])
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
  await prepareInstall(appsList)
}
