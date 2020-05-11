import chalk from 'chalk'
import { createWorkspacesClient } from '../../lib/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'

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
