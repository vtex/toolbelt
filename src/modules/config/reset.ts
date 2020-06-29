import chalk from 'chalk'

import { CommandError } from '../../api/error/errors'
import { saveEnvironment, saveCluster, ENV_DEFAULT_VALUE, CLUSTER_DEFAULT_VALUE } from '../../conf'

export default (name: string) => {
  switch (name) {
    case 'env':
      saveEnvironment(ENV_DEFAULT_VALUE)
      break
    case 'cluster':
      saveCluster(CLUSTER_DEFAULT_VALUE)
      break
    default:
      throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
