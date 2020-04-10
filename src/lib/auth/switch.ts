import chalk from 'chalk'
import { split } from 'ramda'

import { getAccount, getLastUsedAccount, getLogin, getWorkspace } from '../../conf'
import { CommandError } from '../../errors'
import log from '../../logger'
import { SessionManager } from '../../utils/session/SessionManager'

const hasAccountSwitched = (account: string) => {
  return account === getAccount()
}

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

export async function authSwitch(account: string, workspace: string) {
  if (account === '-') {
    account = getLastUsedAccount()
    if (account == null) {
      throw new CommandError('No last used account was found')
    }
  }

  const previousAccount = getAccount()
  // Enable users to type `vtex switch {account}/{workspace}` and switch
  // directly to a workspace without typing the `-w` option.
  const [parsedAccount, parsedWorkspace] = split('/', account)
  const options = { workspace: parsedWorkspace || workspace }
  await switchAccount(parsedAccount, options)
  if (hasAccountSwitched(parsedAccount)) {
    log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(parsedAccount)}`)
  }
}
