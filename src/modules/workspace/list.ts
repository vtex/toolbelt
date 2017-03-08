import * as chalk from 'chalk'
import * as Table from 'cli-table'

import log from '../../logger'
import {workspaces} from '../../clients'
import {getWorkspace, getAccount} from '../../conf'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

export default {
  description: 'List workspaces on this account',
  handler: () => {
    log.debug('Listing workspaces')
    const table = new Table({head: ['Name', 'Last Modified', 'State']})
    return workspaces.list(account)
      .then((workspaces: WorkspaceResponse[]) =>
        workspaces.forEach(workspace => {
          const name = workspace.name === currentWorkspace
            ? chalk.green(`* ${workspace.name}`) : workspace.name
          table.push([name, '?', '?'])
        }),
      )
      .then(() => console.log(table.toString()))
  },
}
