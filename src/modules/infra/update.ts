import { AvailableServices, InstalledService } from '@vtex/api'
import chalk from 'chalk'
import ora from 'ora'
import pad from 'pad'
import semver from 'semver'
import { Region } from '../../conf'
import { createRouterClient } from '../../api/clients/IOClients/infra/Router'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { diffVersions, getTag } from './utils'

const router = createRouterClient()
const { listAvailableServices, listInstalledServices, installService } = router

const promptUpdate = () => Promise.resolve(promptConfirm('Apply version updates?'))

const calculateColSize = (names: string[]): number => Math.max(...names.map(n => n.length))

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
  installedRes.reduce(
    (acc, { name, version: currentVersion }) => {
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
    },
    { latest: {}, update: {} }
  )

const hasUpdate = (update: InfraUpdate): boolean => Object.keys(update).length > 0

const installUpdates = (update: InfraUpdate) =>
  Promise.all(Object.keys(update).map(name => installService(name, update[name].latest)))

export default async () => {
  const spinner = ora('Getting available updates').start()
  try {
    const versions = await Promise.all([listAvailableServices(), listInstalledServices()])
    spinner.stop()
    const versionMap = createVersionMap(...versions)
    logVersionMap(versionMap)
    console.log('')

    if (!hasUpdate(versionMap.update)) {
      log.info('All up to date!')
      return
    }

    await promptUpdate()
      .then(confirm => {
        if (!confirm) {
          return
        }
        spinner.text = 'Installing'
        spinner.start()
        return installUpdates(versionMap.update)
      })
      .then(() => spinner.stop())
      .then(() => log.info('All updates were installed'))
  } catch (err) {
    spinner.stop()
    throw err
  }
}
