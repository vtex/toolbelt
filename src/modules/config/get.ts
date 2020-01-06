import chalk from 'chalk'

import { CommandError } from '../../errors'
import { getEnvironment, getCluster } from './../../conf'

export default (name: string) => {
  switch (name) {
    case 'env':
      const value = getEnvironment() || ''
      console.log(value)
      break
    case 'cluster':
      console.log(getCluster())
      break
    default:
      throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
  }
}
