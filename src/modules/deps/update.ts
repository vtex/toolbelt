import {diffJson} from 'diff'
import * as chalk from 'chalk'

import log from '../../logger'
import {apps} from '../../clients'

const {getDependencies, updateDependencies} = apps

const headers = /(\s\s".*":\s\[\]?,?)/g
const notHeader = /^\s{4}/g

export default {
  description: 'Update your workspace dependencies',
  handler: async () => {
    log.debug('Starting to update dependencies')
    const verbose = log.level === 'debug'
    const previousDeps = await getDependencies()
    const currentDeps = await updateDependencies()
    const diff = diffJson(previousDeps, currentDeps)

    if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
      return log.info('No updates available.')
    }

    log.info('The following dependencies were updated successfully:')

    let lastValue = ''
    diff.forEach(({value, added, removed}: {value: string, added: boolean, removed: boolean}) => {
      if (!verbose && !(added || removed)) {
        const matches = value.match(headers)
        return lastValue = matches ? matches.pop() : ''
      }
      if (notHeader.test(value) && lastValue !== '') {
        process.stdout.write(chalk.gray(lastValue + '\n'))
        lastValue = ''
      }
      const color = added ? chalk.green : removed ? chalk.red : chalk.gray
      process.stdout.write(color(value))
    })
  },
}
