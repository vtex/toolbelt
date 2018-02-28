import chalk from 'chalk'
import {contains, values} from 'ramda'

import {Environment, saveEnvironment} from './../../conf'
import log from '../../logger'
import {CommandError} from '../../errors'

const envValues = values(Environment)

export default (name: string, value: string) => {
  switch (name) {
    case 'env':
      if (!contains(value, envValues)) {
        throw new CommandError(`Invalid value for environment "${value}". Possible values are: ${envValues.join(', ')}`)
      }
      saveEnvironment(value as Environment)
      log.info(`Successfully set environment to "${value}"`)
      break
    default:
      throw new CommandError(`The only supported configuration is ${chalk.blue('env')}`)
  }
}
