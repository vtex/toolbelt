import chalk from 'chalk'
import { createWorkspacesClient } from '../../lib/clients/Workspaces'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { createTable } from '../../table'

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
