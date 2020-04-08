import chalk from 'chalk'
import { getAccount, getLogin, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import { SessionManager } from '../session/SessionManager'
import log from '../../logger'

export const switchAccount = async (account: string, options, previousAccount = getAccount()) => {
  const isValidAccount = /^\s*[\w-]+\s*$/.test(account)
  const workspace = options.w || options.workspace || 'master'

  if (!isValidAccount) {
    throw new CommandError('Invalid account format')
  } else if (!previousAccount) {
    throw new CommandError("You're not logged in right now")
  } else if (previousAccount === account) {
    throw new CommandError(`You're already using the account ${chalk.blue(account)}`)
  }

  const sessionManager = SessionManager.getSessionManager()
  await sessionManager.login(account, { targetWorkspace: workspace })

  log.info(
    `Logged into ${chalk.blue(getAccount())} as ${chalk.green(getLogin())} at workspace ${chalk.green(getWorkspace())}`
  )
}
