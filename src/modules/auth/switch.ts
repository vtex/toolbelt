import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import loginCmd from './login'
import {getAccount, saveAccount} from '../../conf'

const promptLogin = (): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Log in?',
    }),
  )
  .then<boolean>(prop('confirm'))

export default {
  requiredArgs: 'account',
  description: 'Switch to another VTEX account',
  handler: (account: string) => {
    const isValidAccount = /^\s*[\w-]+\s*$/.test(account)
    if (!isValidAccount) {
      return Promise.resolve(log.error('Invalid account format'))
    }
    const previousAccount = getAccount()
    if (!previousAccount) {
      log.error('You\'re not logged in right now')
      return promptLogin()
      .then<any>(confirm =>
        confirm ? loginCmd.handler() : log.error('User cancelled'),
      )
    } else if (previousAccount === account) {
      return Promise.resolve(log.warn(`You're already using the account ${chalk.blue(account)}`))
    }
    return Promise.resolve(saveAccount(account))
      .tap(() =>
        log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(account)}`),
      )
  },
}
