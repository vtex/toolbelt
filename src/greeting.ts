import chalk from 'chalk'

import log from './api/logger'
import { SessionManager } from './api/session/SessionManager'
import { createWorkspacesClient } from './api/clients/IOClients/infra/Workspaces'
import { WorkspaceResponse } from './api/typings/types'

const workspaceState = (meta: WorkspaceResponse) => (meta.production ? 'production' : 'dev')

const getWorkspaceState = async (account: string, workspace: string): Promise<string> => {
  try {
    const workspaces = createWorkspacesClient()
    const meta = await workspaces.get(account, workspace)

    return `${workspaceState(meta)} `
  } catch (err) {
    log.debug(`Unable to fetch workspace state`)
    log.debug(err.message)
    return undefined
  }
}

export const greeting = async (): Promise<string[]> => {
  const { account, userLogged, workspace } = SessionManager.getSingleton()

  if (account && userLogged && workspace) {
    let loggedMessage = 'Logged into'
    let state = await getWorkspaceState(account, workspace)
    if (!state) {
      loggedMessage = `${chalk.red('Not logged in')}. Previously logged into`
      state = ''
    }
    return [
      `${loggedMessage} ${chalk.blue(account)} as ${chalk.green(userLogged)} at ${chalk.yellowBright(
        state
      )}workspace ${chalk.green(workspace)}`,
    ]
  }

  return ['Welcome to VTEX I/O', `Login with ${chalk.green('vtex login')} ${chalk.blue('<account>')}`]
}
