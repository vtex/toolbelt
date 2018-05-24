import chalk from 'chalk'
import * as Table from 'cli-table'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

export default () => {
  log.debug('Listing workspaces')
  const table = new Table({ head: ['Name', 'Weight', 'Production'] })
  return workspaces.list(account)
    .then((workspaces: WorkspaceResponse[]) =>
      workspaces.forEach(workspace => {
        const name = workspace.name === currentWorkspace
          ? chalk.green(`* ${workspace.name}`) : workspace.name
        const weight = workspace.weight
        const production = workspace.production
        table.push([name, weight, production])
      }),
  )
    .then(() => console.log(table.toString()))
}
