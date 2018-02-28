import * as chalk from 'chalk'

import {getEnvironment} from './../../conf'
import {CommandError} from '../../errors'

export default (name: string) => {
  switch (name) {
    case 'env':
      const value = getEnvironment() || ''
      return console.log(value)
    default:
      throw new CommandError(`The only supported configuration is: ${chalk.blue('env')}`)
  }
}
