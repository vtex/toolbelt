import * as pad from 'pad'
import {prop} from 'ramda'
import * as ora from 'ora'
import * as chalk from 'chalk'
import * as semver from 'semver'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import {router} from '../../clients'
import {region} from '../../env'
import {getTag, diffVersions} from './utils'

const {listAvailableServices, listInstalledServices, installService} = router

const promptUpdate = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Apply version updates?',
    })
    .then<boolean>(prop('confirm')),
  )

const calculateColSize = (names: string[]): number =>
  Math.max(...names.map(n => n.length))

const logLatest = (name: string, version: string, colSize: number): void =>
  console.log(`${pad(name, colSize)}  ${chalk.yellow(version)}`)

const logUpdate = (name: string, currentVersion: string, latestVersion: string, colSize: number): void => {
  const [fromVersion, toVersion] = diffVersions(currentVersion, latestVersion)
  console.log(`${pad(name, colSize)}  ${fromVersion} ${chalk.gray('->')} ${toVersion}`)
}

const logVersionMap = ({latest, update}: InfraVersionMap): void => {
  const latestKeys = Object.keys(latest)
  const updateKeys = Object.keys(update)
  const colSize = calculateColSize([...latestKeys, ...updateKeys])
  latestKeys.map(k => logLatest(k, latest[k], colSize))
  updateKeys.map(k => logUpdate(k, update[k].current, update[k].latest, colSize))
}

const createVersionMap = (availableRes: InfraAvailableResources, installedRes: InfraInstalledResources[]): InfraVersionMap =>
  installedRes.reduce((acc, {name, version: currentVersion}) => {
    const tag = getTag(currentVersion)
    const latestVersion = availableRes[name].versions[region()]
      .filter(v => getTag(v) === tag)
      .sort(semver.rcompare)[0]
    if (currentVersion !== latestVersion) {
      acc.update[name] = {
        latest: latestVersion,
        current: currentVersion,
      }
    } else {
      acc.latest[name] = currentVersion
    }
    return acc
  }, {latest: {}, update: {}})

const hasUpdate = (update: InfraUpdate): boolean =>
  Object.keys(update).length > 0

const installUpdates = (update: InfraUpdate): Bluebird<void[]> =>
  Promise.all(
    Object.keys(update).map(name => installService(name, update[name].latest)),
  )

export default () => {
  const spinner = ora('Getting available updates').start()
  return Promise.all([listAvailableServices(), listInstalledServices()])
    .tap(() => spinner.stop())
    .spread(createVersionMap)
    .tap(logVersionMap)
    .then(({update}) => {
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
