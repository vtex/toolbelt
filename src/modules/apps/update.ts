import { Housekeeper } from '@vtex/api'
import * as ora from 'ora'
import { compose, concat, difference, filter, identity, map, path as ramdaPath, pluck, prop, union  } from 'ramda'

import { toMajorRange } from '../../locator'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import { matchedDepsDiffTable } from '../utils'
import { getIOContext, IOClientOptions } from '../utils'


const promptUpdate = (): Promise<boolean> =>
  Promise.resolve(
    promptConfirm('Apply version updates?')
  )

const sourceFilter = (source: string) => filter((obj: { source: string }) => includes(prop('source', obj), [source]))

const includes = (k: string, list: string[]) => list.indexOf(k) >= 0

const printAppsDiff = (resolvedUpdates: any, message: string, path: string[], filterFunction?: (obj: any) => boolean, pluckFunction?: (obj: any) => any) => {
  if (!filterFunction) {
    filterFunction = identity
  }
  if (!pluckFunction) {
    pluckFunction = identity
  }

  const appsToBeUpdated = compose<any, any, any, any>(
    pluckFunction,
    filterFunction,
    ramdaPath(concat(['updates'], path))
  )(resolvedUpdates) as string[]

  const appMajorsToBeUpdated = map(toMajorRange, appsToBeUpdated)

  const currentApps = compose<any, any, any, any>(
    filter((appId: string) => includes(toMajorRange(appId), appMajorsToBeUpdated)),
    pluckFunction,
    ramdaPath(concat(['state'], path))
  )(resolvedUpdates) as string[]

  const diffTable = matchedDepsDiffTable('current', 'latest', currentApps, appsToBeUpdated)
  if (diffTable.length === 1) {
    return false
  }
  log.info(message)
  console.log(diffTable.toString())
  return true
}

const printEditionAppsDiff = (resolvedUpdates: any) => {
  const oldState = ramdaPath(['state', 'edition'], resolvedUpdates) as string[]
  const newState = difference(
    union(oldState, ramdaPath(['updates', 'edition', 'install'], resolvedUpdates)),
    ramdaPath(['updates', 'edition', 'uninstall'], resolvedUpdates)
  )
  const diffTable = matchedDepsDiffTable('current', 'latest', oldState, newState)
  if (diffTable.length === 1) {
    return false
  }
  log.info(`The following apps will be installed/uninstalled due to changes to current edition`)
  console.log(diffTable.toString())
  return true
}

export default async () => {
  const housekeeper = new Housekeeper(getIOContext(), IOClientOptions)
  const getSpinner = ora('Getting available updates').start()
  const resolvedUpdates = await housekeeper.resolve()
  getSpinner.stop()
  const hasAvailableUpdates =
    printAppsDiff(resolvedUpdates, `The following infra apps will be updated`, ['infra']) ||
    printAppsDiff(resolvedUpdates, `The following installed apps will be updated:`, ['apps'], sourceFilter('installation'), pluck('id')) ||
    printAppsDiff(resolvedUpdates, `The following dependencies will be updated:`, ['apps'], sourceFilter('dependency'), pluck('id')) ||
    printAppsDiff(resolvedUpdates, `The following edition apps will be updated`, ['apps'], sourceFilter('edition'), pluck('id')) ||
    printEditionAppsDiff(resolvedUpdates)
    if (!hasAvailableUpdates) {
    log.info('No updates available')
  }

  const confirm = await promptUpdate()
  if (!confirm) {
    return
  }
  const applySpinner = ora('Applying updates').start()
  await housekeeper.apply(resolvedUpdates)
  applySpinner.stop()
}
