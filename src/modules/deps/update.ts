import chalk from 'chalk'
import { diffJson } from 'diff'
import { compose, keys, map, path, prepend } from 'ramda'

import { apps } from '../../clients'
import { parseLocator } from '../../locator'
import log from '../../logger'
import { parseArgs } from '../apps/utils'
import { removeNpm } from './utils'

const { getDependencies, updateDependencies, updateDependency } = apps

const cleanDeps = compose(
  keys,
  removeNpm
)

export default async (optionalApp: string, options) => {
  const appsList = prepend(optionalApp, parseArgs(options._)).filter(arg => arg && arg !== '')
  try {
    log.debug('Starting update process')
    const previousDeps = await getDependencies()
    let currentDeps
    if (appsList.length === 0) {
      currentDeps = await updateDependencies()
    } else {
      await Promise.mapSeries(appsList, async (locator: string) => {
        const { vendor, name, version } = parseLocator(locator)
        if (!name || !version) {
          log.error(`App ${locator} has an invalid app format, please use <vendor>.<name>@<version>`)
        } else {
          try {
            log.debug(`Starting to update ${locator}`)
            await updateDependency(`${vendor}.${name}`, version, vendor)
          } catch (e) {
            log.error(e.message)
            if (path(['response', 'data', 'message'], e)) {
              log.error(e.response.data.message)
            }
          }
        }
      })
      currentDeps = await getDependencies()
    }
    const [cleanPrevDeps, cleanCurrDeps] = map(cleanDeps, [previousDeps, currentDeps])
    const diff = diffJson(cleanPrevDeps, cleanCurrDeps)
    let nAdded = 0
    let nRemoved = 0
    diff.forEach(
      ({ count, value, added, removed }: { count: number; value: string; added: boolean; removed: boolean }) => {
        const color = added ? chalk.green : removed ? chalk.red : chalk.gray
        if (added) {
          nAdded += count
        } else if (removed) {
          nRemoved += count
        }
        process.stdout.write(color(value))
      }
    )
    if (nAdded === 0 && nRemoved === 0) {
      log.info('No dependencies updated')
    } else {
      if (nAdded > 0) {
        log.info('', nAdded, nAdded > 1 ? ' dependencies ' : ' dependency ', chalk.green('added'), ' successfully')
      }
      if (nRemoved > 0) {
        log.info('', nRemoved, nRemoved > 1 ? ' dependencies ' : 'dependency ', chalk.red('removed'), ' successfully')
      }
    }
  } catch (e) {
    log.error(e.message)
    if (path(['response', 'data', 'message'], e)) {
      log.error(e.response.data.message)
    }
  }
}
