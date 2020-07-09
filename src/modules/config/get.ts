import chalk from 'chalk'

import { CommandError } from '../../api/error/errors'
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
      throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
