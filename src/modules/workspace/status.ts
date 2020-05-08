import chalk from 'chalk'
import { createWorkspacesClient } from '../../lib/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'

const workspaceState = (meta: WorkspaceResponse) => (meta.production ? 'production' : 'dev')

export default async (name: string): Promise<void> => {
  const session = SessionManager.getSingleton()
  const { account } = session
  const workspace = name || session.workspace

  const workspaces = createWorkspacesClient()
  const meta = await workspaces.get(account, workspace)

  log.info(
    `Workspace ${chalk.green(workspace)} in account ${chalk.blue(account)} is a ${chalk.yellowBright(
      workspaceState(meta)
    )} workspace with weight ${chalk.yellowBright(`${meta.weight}`)}`
  )
}
