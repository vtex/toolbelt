import chalk from 'chalk'
import { createFlowIssueError } from '../../error/utils'
import { SessionManager } from '../../session/SessionManager'
import logger from '../../logger'
import { handleErrorCreatingWorkspace, workspaceCreator } from '../workspace/create'
import welcome from '../../../modules/auth/welcome'
import { COLORS } from '../../constants'

interface SwitchOptions {
  showWelcomeMessage?: boolean
  workspace?: string
  gracefulAccountCheck?: boolean
}

interface AccountReturnArgs {
  previousAccount: string
  previousWorkspace: string
  promptConfirmation?: boolean
}

enum SwitchStatus {
  SwitchedAccount = 'SwitchedAccount',
  SwitchedOnlyWorkspace = 'SwitchedOnlyWorkspace',
  SwitchedNothing = 'SwitchedNothing',
}

const checkAndSwitch = async (targetAccount: string, targetWorkspace: string): Promise<SwitchStatus> => {
  const session = SessionManager.getSingleton()
  const { account: initialAccount, workspace: initialWorkspace } = session
  const isValidAccount = /^\s*[\w-]+\s*$/.test(targetAccount)

  if (!isValidAccount) {
    throw createFlowIssueError('Invalid account format')
  } else if (!initialAccount) {
    throw createFlowIssueError("You're not logged in right now")
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

  logger.info(
    `Logged into ${chalk.hex(COLORS.BLUE)(account)} as ${chalk.green(userLogged)} at workspace ${chalk.green(
      workspace
    )}`
  )

  if (initialAccount !== targetAccount) {
    return SwitchStatus.SwitchedAccount
  }
  if (initialWorkspace !== targetWorkspace) {
    return SwitchStatus.SwitchedOnlyWorkspace
  }
  return SwitchStatus.SwitchedNothing
}

export const switchAccount = async (targetAccount: string, options: SwitchOptions): Promise<boolean> => {
  const { account: currAccount, lastUsedAccount, workspace: currWorkspace } = SessionManager.getSingleton()

  if (options.gracefulAccountCheck && currAccount === targetAccount) {
    return false
  }

  if (targetAccount === '-') {
    targetAccount = lastUsedAccount
    if (targetAccount == null) {
      throw createFlowIssueError('No last used account was found')
    }
  }

  const previousAccount = currAccount
  const [parsedAccount, parsedWorkspace] = targetAccount.split('/')
  if (parsedWorkspace) {
    options = { ...options, workspace: parsedWorkspace }
  }

  const switchStatus = await checkAndSwitch(parsedAccount, options.workspace || 'master')
  if (switchStatus === SwitchStatus.SwitchedAccount) {
    logger.info(`Switched from ${chalk.hex(COLORS.BLUE)(previousAccount)} to ${chalk.hex(COLORS.BLUE)(parsedAccount)}`)
  } else if (switchStatus === SwitchStatus.SwitchedOnlyWorkspace) {
    logger.info(
      `Switched from workspace ${chalk.hex(COLORS.BLUE)(currWorkspace)} to ${chalk.hex(COLORS.BLUE)(
        parsedWorkspace
      )} in account ${chalk.hex(COLORS.BLUE)(parsedAccount)}`
    )
  } else if (switchStatus === SwitchStatus.SwitchedNothing) {
    logger.info(`You're already logged in ${chalk.hex(COLORS.BLUE)(targetAccount)}`)
  }

  if (options.showWelcomeMessage && switchStatus === SwitchStatus.SwitchedAccount) {
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
            message: `Now you are logged in ${chalk.hex(COLORS.BLUE)(
              SessionManager.getSingleton().account
            )}. Do you want to return to ${chalk.hex(COLORS.BLUE)(previousAccount)} account?`,
          },
        }
      : null),
  })
}
