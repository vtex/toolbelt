import * as chalk from 'chalk'

import {CommandError} from '../../errors'
import log from '../../logger'
import loginCmd from './login'
import {getAccount} from '../../conf'

const previousAccount = getAccount()

export default {
  requiredArgs: 'account',
  description: 'Switch to another VTEX account',
  options: [
    {
      short: 'w',
      long: 'workspace',
      description: 'Specify login workspace',
      type: 'string',
    },
  ],
  handler: async (account: string, options) => {
    const isValidAccount = /^\s*[\w-]+\s*$/.test(account)
    const workspace = options.w || options.workspace || 'master'

    if (!isValidAccount) {
      throw new CommandError('Invalid account format')
    } else if (!previousAccount) {
      throw new CommandError('You\'re not logged in right now')
    } else if (previousAccount === account) {
      throw new CommandError(`You're already using the account ${chalk.blue(account)}`)
    }
    await loginCmd.handler({account, workspace})
    log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(account)}`)
  },
}
