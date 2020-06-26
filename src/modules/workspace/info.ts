import chalk from 'chalk'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'

const { get } = createWorkspacesClient()

const pretty = p => (p ? chalk.green('true') : chalk.red('false'))

export default async () => {
  const { account, workspace: currentWorkspace } = SessionManager.getSingleton()

  const meta = await get(account, currentWorkspace)
  const weight = currentWorkspace === 'master' ? 100 : meta.weight
  return log.info(
    `Workspace: name=${chalk.green(currentWorkspace)} production=${pretty(meta.production)} weight=${weight}`
  )
}
