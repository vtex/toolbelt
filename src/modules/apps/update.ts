import { Housekeeper } from '@vtex/api'
import * as ora from 'ora'
import { compose, filter, map, path, pluck, prop } from 'ramda'

import { toMajorRange } from '../../locator'
import log from '../../logger'
import { matchedDepsDiffTable } from '../deps/utils'
import { promptConfirm } from '../prompts'
import { getIOContext, IOClientOptions } from '../utils'


const promptUpdate = (): Promise<boolean> =>
  Promise.resolve(
    promptConfirm('Apply version updates?')
  )

const toAppName = (appId: string) => appId.split('@')[0]

const includes = (k: string, list: string[]) => list.indexOf(k) >= 0

const printAppsDiff = (source: string, resolvedUpdates: any, message: string) => {
  const appsToBeUpdated = compose<any, any, any, any>(
    pluck('id'),
    filter((obj: { source: string }) => includes(prop('source', obj), [source])),
    path(['updates', 'apps'])
  )(resolvedUpdates) as string[]
  const appMajorsToBeUpdated = map(toAppName, appsToBeUpdated)
  const currentApps = compose<any, any, any, any>(
    filter((appId: string) => includes(toMajorRange(appId), appMajorsToBeUpdated)),
    pluck('id'),
    path(['state', 'apps'])
  )(resolvedUpdates) as string[]
  const diffTable = matchedDepsDiffTable('', '', currentApps, appsToBeUpdated)
  if (diffTable.length === 1) {
    return false
  }
  log.info(message)
  console.log(diffTable.toString())
  return true
}

export default async () => {
  const housekeeper = new Housekeeper(getIOContext(), IOClientOptions)
  const getSpinner = ora('Getting available updates').start()
  const resolvedUpdates = await housekeeper.resolve()
  console.log(JSON.stringify(resolvedUpdates, null, 2))
  getSpinner.stop()
  const anything = printAppsDiff('installation', resolvedUpdates,
  `The following installed apps will be updated:`) ||
  printAppsDiff('dependency', resolvedUpdates,
  `The following dependencies will be updated:`) ||
  printAppsDiff('edition', resolvedUpdates,
  `The following infra apps will be updated`)
  if (!anything) {
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
