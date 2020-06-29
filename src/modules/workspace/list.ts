import chalk from 'chalk'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { createTable } from '../../api/table'

export default () => {
  const { account, workspace: currentWorkspace } = SessionManager.getSingleton()

  log.debug('Listing workspaces')
  const table = createTable({ head: ['Name', 'Weight', 'Production'] })

  const workspaces = createWorkspacesClient()

  return workspaces
    .list(account)
    .then((workspaceArray: WorkspaceResponse[]) =>
      workspaceArray.forEach(workspace => {
        const name = workspace.name === currentWorkspace ? chalk.green(`* ${workspace.name}`) : workspace.name
        const { weight } = workspace
        const { production } = workspace
        table.push([name, weight, production])
      })
    )
    .then(() => console.log(table.toString()))
}
