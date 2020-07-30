import chalk from 'chalk'
import { createFlowIssueError } from '../../api/error/utils'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { handleErrorCreatingWorkspace, workspaceCreator } from './create'
import resetWks from './reset'
import { ColorifyConstants } from '../../lib/constants/Colors'

interface WorkspaceUseOptions {
  production: boolean
  reset: boolean
}

export default async (name: string, options?: WorkspaceUseOptions) => {
  const session = SessionManager.getSingleton()
  const production = options?.production
  const reset = options?.reset ?? false

  if (name === '-') {
    name = session.lastUsedWorkspace
    if (name == null) {
      throw createFlowIssueError('No last used workspace was found')
    }
  }

  const result = await session.workspaceSwitch({
    targetWorkspace: name,
    workspaceCreation: {
      production,
      promptCreation: true,
      creator: workspaceCreator,
      onError: handleErrorCreatingWorkspace,
    },
  })

  if (reset && result !== 'created') {
    await resetWks(name, { production })
  }

  const { account, workspace } = session
  log.info(
    `${chalk.bold('Workspace change:')} You are now using the workspace ${ColorifyConstants.ID(
      workspace
    )} on account ${ColorifyConstants.ID(account)}.\n`
  )
}
