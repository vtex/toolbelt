import chalk from 'chalk'
import { CommandError } from '../../errors'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { handleErrorCreatingWorkspace, workspaceCreator } from './create'
import resetWks from './reset'

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
      throw new CommandError('No last used workspace was found')
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
  log.info(`You're now using the workspace ${chalk.green(workspace)} on account ${chalk.blue(account)}!`)
}
