import {diffJson} from 'diff'
import * as chalk from 'chalk'
import {mapSeries} from 'bluebird'
import {map, keys, compose} from 'ramda'

import log from '../../logger'
import {apps} from '../../clients'
import {listenBuild} from '../utils'
import {removeNpm} from './utils'

const {getDependencies, updateDependencies} = apps

const cleanDeps = compose(keys, removeNpm)

export default async () => {
  log.debug('Starting to update dependencies')

  const updateAndListen = () => listenBuild('deps_requester', updateDependencies)

  return mapSeries([getDependencies, updateAndListen], f => f())
    .tap(() => log.info('The following dependencies were updated successfully:'))
    .spread((previousDeps, currentDeps) => {
      const [cleanPrevDeps, cleanCurrDeps] = map(cleanDeps, [previousDeps, currentDeps])
      const diff = diffJson(cleanPrevDeps, cleanCurrDeps)

      diff.forEach(({value, added, removed}: {value: string, added: boolean, removed: boolean}) => {
        const color = added ? chalk.green : removed ? chalk.red : chalk.gray
        process.stdout.write(color(value))
      })
    })
    .catch(e => {
      log.error(e.message)
    })
}
