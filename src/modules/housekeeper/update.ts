import { Housekeeper, HousekeeperStatesAndUpdates } from '@vtex/api'
import chalk from 'chalk'
import * as ora from 'ora'
import { any, compose, difference, filter, identity, isEmpty, map, path, pluck, prop, props, union } from 'ramda'

import { toMajorRange } from '../../locator'
import log from '../../logger'
import { isVerbose } from '../../utils'
import { promptConfirm } from '../prompts'
import { matchedDepsDiffTable } from '../utils'
import { getIOContext, IOClientOptions } from '../utils'

const promptUpdate = (): Promise<boolean> => Promise.resolve(promptConfirm('Apply version updates?'))

const toMajorLocator = (appId: string) => {
  const [appName, appVersion] = appId.split('@', 2)
  return `${appName}@${toMajorRange(appVersion)}`
}

const sourceFilter = (source: string) => filter((obj: { source: string }) => includes(prop('source', obj), [source]))

const includes = (k: string, list: string[]) => list.indexOf(k) >= 0

const printAppsDiff = (
  resolvedUpdates: HousekeeperStatesAndUpdates,
  message: string,
  type: 'apps' | 'infra' | 'runtimes',
  source?: 'installation' | 'dependency' | 'edition',
  onlyShowTableIfVerbose?: boolean
) => {
  let filterFunction: (obj: any) => boolean
  let pluckFunction: (obj: any) => any
  if (type === 'apps') {
    if (!source) {
      throw new Error(`source argument must be supplied when type === 'apps'`)
    }
    filterFunction = sourceFilter(source)
    pluckFunction = pluck('id')
  } else if (includes(type, ['infra', 'runtimes'])) {
    filterFunction = identity
    pluckFunction = identity
  } else {
    throw new Error(`Invalid type: ${type}`)
  }

  const appsToBeUpdated = compose<any, any, any, any>(
    pluckFunction,
    filterFunction,
    path(['updates', type])
  )(resolvedUpdates) as string[]

  const appMajorsToBeUpdated = map(toMajorLocator, appsToBeUpdated)

  const currentApps = compose<any, any, any, any>(
    filter((appId: string) => includes(toMajorLocator(appId), appMajorsToBeUpdated)),
    pluckFunction,
    path(['state', type])
  )(resolvedUpdates) as string[]

  const diffTable = matchedDepsDiffTable('current', 'latest', currentApps, appsToBeUpdated)
  if (diffTable.length === 1) {
    return
  }
  if (onlyShowTableIfVerbose && !isVerbose) {
    console.log(message)
    return
  }
  console.log(`The following ${message}`)
  console.log(diffTable.toString() + `\n`)
}

const printEditionAppsDiff = (resolvedUpdates: any) => {
  const oldState = path(['state', 'edition'], resolvedUpdates) as string[]
  const newState = difference(
    union(oldState, path(['updates', 'editionApps', 'install'], resolvedUpdates)),
    path(['updates', 'editionApps', 'uninstall'], resolvedUpdates)
  )
  const diffTable = matchedDepsDiffTable('uninstall', 'install', oldState, newState)
  if (diffTable.length === 1) {
    return
  }
  console.log(`The following apps will be uninstalled/installed due to changes to current edition:`)
  console.log(diffTable.toString() + '\n')
}

const hasAvailableUpdates = (resolvedUpdates: HousekeeperStatesAndUpdates) => {
  const updates = prop('updates', resolvedUpdates)
  const anyAppsUpdates = compose<any, any, any, any>(
    any(x => !!x),
    map(x => !isEmpty(x)),
    props(['apps', 'infra', 'runtimes'])
  )(updates)
  const anyEditionUpdates = compose<any, any, any, any, any>(
    any(x => !!x),
    map(x => !isEmpty(x)),
    props(['install', 'uninstall']),
    prop('editionApps')
  )(updates)
  return anyAppsUpdates || anyEditionUpdates
}

const printUpdates = (resolvedUpdates: HousekeeperStatesAndUpdates) => {
  printAppsDiff(resolvedUpdates, `${chalk.blue.bold('Infra')} apps will be updated`, 'infra', undefined, true)
  printAppsDiff(resolvedUpdates, `${chalk.blue.bold('Runtimes')} will be updated`, 'runtimes', undefined, true)
  printAppsDiff(resolvedUpdates, `${chalk.blue.bold('Installed')} apps will be updated:`, 'apps', 'installation')
  printAppsDiff(resolvedUpdates, `${chalk.blue.bold('Dependencies')} will be updated:`, 'apps', 'dependency')
  printAppsDiff(resolvedUpdates, `${chalk.blue.bold('Edition')} apps will be updated`, 'apps', 'edition')
  printEditionAppsDiff(resolvedUpdates)
}

export default async () => {
  const housekeeper = new Housekeeper(getIOContext(), IOClientOptions)
  const getSpinner = ora('Getting available updates').start()
  const resolvedUpdates = await housekeeper.resolve()
  getSpinner.stop()
  if (!hasAvailableUpdates(resolvedUpdates)) {
    log.info('No updates available')
    return
  }
  printUpdates(resolvedUpdates)
  const confirm = await promptUpdate()
  if (!confirm) {
    return
  }
  const applySpinner = ora('Applying updates').start()
  await housekeeper.apply(resolvedUpdates)
  applySpinner.stop()
}
