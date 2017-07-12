import {diffJson} from 'diff'
import * as chalk from 'chalk'

import log from '../../logger'
import {apps} from '../../clients'

import {listenBuildSuccess} from '../apps/utils'
import {removeNpm} from './list'
import {keys, compose} from 'ramda'

const {getDependencies, updateDependencies} = apps

const cleanDeps = compose(keys, removeNpm)

export default {
  description: 'Update your workspace dependencies',
  handler: async () => {
    log.debug('Starting to update dependencies')

    listenBuildSuccess('deps_requester', (err) => {
      if (err) {
        process.exit(1)
        return
      }

      log.info('The following dependencies were updated successfully:')

      diff.forEach(({value, added, removed}: {value: string, added: boolean, removed: boolean}) => {
        const color = added ? chalk.green : removed ? chalk.red : chalk.gray
        process.stdout.write(color(value))
      })

      process.exit(0)
    })

    const previousDeps = cleanDeps(await getDependencies())
    const currentDeps = cleanDeps(await updateDependencies())
    const diff = diffJson(previousDeps, currentDeps)

  },
}
