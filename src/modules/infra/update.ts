import { AvailableServices, InstalledService } from '@vtex/api'
import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as ora from 'ora'
import * as pad from 'pad'
import * as semver from 'semver'

import { router } from '../../clients'
import { Region } from '../../conf'
import log from '../../logger'
import { promptConfirm } from '../utils'
import { diffVersions, getTag } from './utils'

const { listAvailableServices, listInstalledServices, installService } = router

const promptUpdate = (): Bluebird<boolean> =>
  Promise.resolve(
    promptConfirm('Apply version updates?')
  )

const calculateColSize = (names: string[]): number =>
  Math.max(...names.map(n => n.length))

const logLatest = (name: string, version: string, colSize: number): void =>
  console.log(`${pad(name, colSize)}  ${chalk.yellow(version)}`)

const logUpdate = (name: string, currentVersion: string, latestVersion: string, colSize: number): void => {
  const [fromVersion, toVersion] = diffVersions(currentVersion, latestVersion)
  console.log(`${pad(name, colSize)}  ${fromVersion} ${chalk.gray('->')} ${toVersion}`)
}

const logVersionMap = ({ latest, update }: InfraVersionMap): void => {
  const latestKeys = Object.keys(latest)
  const updateKeys = Object.keys(update)
  const colSize = calculateColSize([...latestKeys, ...updateKeys])
  latestKeys.map(k => logLatest(k, latest[k], colSize))
  updateKeys.map(k => logUpdate(k, update[k].current, update[k].latest, colSize))
}

const createVersionMap = (availableRes: AvailableServices, installedRes: InstalledService[]): InfraVersionMap =>
  installedRes.reduce((acc, { name, version: currentVersion }) => {
    const tag = getTag(currentVersion)
    const latestVersion = availableRes[name].versions[Region.Production] // See comment in src/modules/infra/install.ts:82
      .filter(v => getTag(v) === tag)
      .sort(semver.rcompare)[0]
    if (currentVersion !== latestVersion) {
      acc.update[name] = {
        current: currentVersion,
        latest: latestVersion,
      }
    } else {
      acc.latest[name] = currentVersion
    }
    return acc
  }, { latest: {}, update: {} })

const hasUpdate = (update: InfraUpdate): boolean =>
  Object.keys(update).length > 0

const installUpdates = (update: InfraUpdate): Bluebird<void[]> =>
  Promise.all(
    Object.keys(update).map(name => installService(name, update[name].latest))
  )

export default () => {
  const spinner = ora('Getting available updates').start()
  return Promise.all([listAvailableServices(), listInstalledServices()])
    .tap(() => spinner.stop())
    .spread(createVersionMap)
    .tap(logVersionMap)
    .then(({ update }) => {
      console.log('')
      return hasUpdate(update)
        ? promptUpdate()
          .then(confirm => {
            if (!confirm) {
              return
            }
            spinner.text = 'Installing'
            spinner.start()
            return installUpdates(update)
          })
          .then(() => spinner.stop())
          .then(() => log.info('All updates were installed'))
        : log.info('All up to date!')
    })
    .catch(err => {
      spinner.stop()
      throw err
    })
}
