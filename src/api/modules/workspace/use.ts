import { createFlowIssueError } from '../../error/utils'
import { SessionManager } from '../../session/SessionManager'
import log from '../../logger'
import { handleErrorCreatingWorkspace, workspaceCreator } from './create'
import workspaceReset from './reset'
import { Messages } from '../../constants/Messages'

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
    await workspaceReset(name, { production })
  }

  const { account, workspace } = session
  log.info(Messages.USE_SUCCESS(workspace, account))
}
