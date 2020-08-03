import chalk from 'chalk'

import { createFlowIssueError } from '../../api/error'
import { getEnvironment, getCluster } from '../../conf'

export default (name: string) => {
  switch (name) {
    case 'env':
      console.log(getEnvironment() || '')
      break
    case 'cluster':
      console.log(getCluster())
      break
    default:
      throw createFlowIssueError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
