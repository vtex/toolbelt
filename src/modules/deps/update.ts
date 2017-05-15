import {diffJson} from 'diff'
import * as chalk from 'chalk'

import log from '../../logger'
import {apps} from '../../clients'

const {getDependencies, updateDependencies} = apps

const notHeader = /\n?\s\s\s\s.*,?|\n?\s\s\],/g

export default {
  description: 'Update your workspace dependencies',
  handler: async () => {
    log.debug('Starting to update dependencies')
    const verbose = log.level === 'debug'
    const previousDeps = await getDependencies()
    const currentDeps = await updateDependencies()
    const diff = diffJson(previousDeps, currentDeps)
    let lastValue = ''
    diff.forEach(({value, added, removed}: {value: string, added: boolean, removed: boolean}) => {
      if (!verbose && !(added || removed)) {
        // Save the last header to show nested diffs with better context
        return lastValue = value
          .replace(notHeader, '')
          .trim()
          .split('\n')
          .pop()
      }
      if (notHeader.test(value) && lastValue !== '') {
        process.stdout.write(chalk.gray(lastValue + '\n'))
        lastValue = ''
      }
      const color = added ? chalk.green : removed ? chalk.red : chalk.gray
      process.stdout.write(color(value))
    })
    process.stdout.write('\n')
    log.info('Finished updating dependencies')
  },
}
