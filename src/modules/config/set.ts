import chalk from 'chalk'
import { contains, values } from 'ramda'

import { CommandError } from '../../api/error/errors'
import log from '../../api/logger'
import { Environment, saveEnvironment, saveCluster } from '../../conf'

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
    case 'cluster':
      saveCluster(value)
      log.info(`Successfully set cluster to "${value}"`)
      break
    default:
      throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
