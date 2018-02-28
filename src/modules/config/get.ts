import chalk from 'chalk'

import {getEnvironment} from './../../conf'
import {CommandError} from '../../errors'

export default (name: string) => {
  switch (name) {
    case 'env':
      const value = getEnvironment() || ''
      console.log(value)
      break
    default:
      throw new CommandError(`The only supported configuration is: ${chalk.blue('env')}`)
  }
}
