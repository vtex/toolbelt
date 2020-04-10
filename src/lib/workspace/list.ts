import chalk from 'chalk'

import { createTable } from '../../utils/table'
import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../utils/conf'
import log from '../../utils/logger'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

export function workspaceList() {
  log.debug('Listing workspaces')
  const table = createTable({ head: ['Name', 'Weight', 'Production'] })
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
