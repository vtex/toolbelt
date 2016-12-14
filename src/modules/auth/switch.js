import chalk from 'chalk'
import log from '../../logger'
import loginCmd from './login'
import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import {getAccount, saveAccount} from '../../conf'

function promptLogin () {
  return Promise.try(() =>
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Log in?',
    })
  )
  .then(({confirm}) => confirm)
}

export default {
  requiredArgs: 'account',
  description: 'Switch to another VTEX account',
  handler: (account) => {
    const isValidAccount = /^\s*[\w-]+\s*$/.test(account)
    if (!isValidAccount) {
      return Promise.resolve(log.error('Invalid account format'))
    }

    const previousAccount = getAccount()
    if (!previousAccount) {
      log.error('You\'re not logged in right now')
      return promptLogin()
      .then(confirm => confirm ? loginCmd.handler() : log.error('User cancelled'))
    } else if (previousAccount === account) {
      return Promise.resolve(log.warn(`You're already using the account ${chalk.blue(account)}`))
    }

    return Promise.resolve(saveAccount(account))
    .tap(() =>
      log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(account)}`)
    )
  },
}
