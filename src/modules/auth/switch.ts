import chalk from 'chalk'

import { getAccount } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import loginCmd from './login'


export const switchAccount = async (account: string, options, previousAccount = getAccount()) => {
  const isValidAccount = /^\s*[\w-]+\s*$/.test(account)
  const workspace = options.w || options.workspace || 'master'

  if (!isValidAccount) {
    throw new CommandError('Invalid account format')
  } else if (!previousAccount) {
    throw new CommandError('You\'re not logged in right now')
  } else if (previousAccount === account) {
    throw new CommandError(`You're already using the account ${chalk.blue(account)}`)
  }
  
  return await loginCmd({ account, workspace })
}

const hasAccountSwitched = (account: string) => {
  return account == getAccount()
}

export default async (account: string, options) => {
  const previousAccount = getAccount()
  await switchAccount(account, options)
  if (hasAccountSwitched(account)) {
    log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(account)}`)
  }
}
