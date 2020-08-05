import chalk from 'chalk'
import { split } from 'ramda'
import { createFlowIssueError } from '../../api/error/utils'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { handleErrorCreatingWorkspace, workspaceCreator } from '../workspace/create'
import welcome from './welcome'

interface SwitchOptions {
  showWelcomeMessage?: boolean
  workspace?: string
  gracefulAccountCheck?: boolean
  initialPrompt?: {
    message: string
  }
}

interface AccountReturnArgs {
  previousAccount: string
  previousWorkspace: string
  promptConfirmation?: boolean
}

const checkAndSwitch = async (targetAccount: string, targetWorkspace: string) => {
  const session = SessionManager.getSingleton()
  const { account: currAccount } = session
  const isValidAccount = /^\s*[\w-]+\s*$/.test(targetAccount)

  if (!isValidAccount) {
    throw createFlowIssueError('Invalid account format')
  } else if (!currAccount) {
    throw createFlowIssueError("You're not logged in right now")
  } else if (currAccount === targetAccount) {
    throw createFlowIssueError(`You're already using the account ${chalk.blue(targetAccount)}`)
  }

  await session.login(targetAccount, {
    targetWorkspace,
    workspaceCreation: {
      promptCreation: true,
      creator: workspaceCreator,
      onError: handleErrorCreatingWorkspace,
    },
  })

  const { account, workspace, userLogged } = session

  log.info(`Logged into ${chalk.blue(account)} as ${chalk.green(userLogged)} at workspace ${chalk.green(workspace)}`)
}

export const switchAccount = async (account: string, options: SwitchOptions): Promise<boolean> => {
  const { account: currAccount, lastUsedAccount } = SessionManager.getSingleton()

  if (options.gracefulAccountCheck && currAccount === account) {
    return false
  }

  if (options.initialPrompt) {
    const confirm = await promptConfirm(options.initialPrompt.message)
    if (!confirm) {
      return false
    }
  }

  if (account === '-') {
    account = lastUsedAccount
    if (account == null) {
      throw createFlowIssueError('No last used account was found')
    }
  }

  const previousAccount = currAccount
  // Enable users to type `vtex switch {account}/{workspace}` and switch
  // directly to a workspace without typing the `-w` option.
  const [parsedAccount, parsedWorkspace] = split('/', account)
  if (parsedWorkspace) {
    options = { ...options, workspace: parsedWorkspace }
  }

  await checkAndSwitch(parsedAccount, options.workspace || 'master')
  log.info(`Switched from ${chalk.blue(previousAccount)} to ${chalk.blue(parsedAccount)}`)

  if (options.showWelcomeMessage) {
    await welcome()
  }

  return true
}

export function returnToPreviousAccount({
  previousAccount,
  previousWorkspace,
  promptConfirmation = true,
}: AccountReturnArgs) {
  return switchAccount(previousAccount, {
    workspace: previousWorkspace,
    gracefulAccountCheck: true,
    showWelcomeMessage: false,
    ...(promptConfirmation
      ? {
          initialPrompt: {
            message: `Now you are logged in ${chalk.blue(
              SessionManager.getSingleton().account
            )}. Do you want to return to ${chalk.blue(previousAccount)} account?`,
          },
        }
      : null),
  })
}
