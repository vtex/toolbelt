import chalk from 'chalk'
import { contains, values } from 'ramda'
import { createFlowIssueError } from '../../api/error'
import log from '../../api/logger'
import { Environment, saveEnvironment, saveCluster } from '../../conf'

const envValues = values(Environment)

export default (name: string, value: string) => {
  switch (name) {
    case 'env':
      if (!contains(value, envValues)) {
        throw createFlowIssueError(
          `Invalid value for environment "${value}". Possible values are: ${envValues.join(', ')}`
        )
      }
      saveEnvironment(value as Environment)
      log.info(`Successfully set environment to "${value}"`)
      break
    case 'cluster':
      saveCluster(value)
      log.info(`Successfully set cluster to "${value}"`)
      break
    default:
      throw createFlowIssueError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
