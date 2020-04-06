import { flags } from '@oclif/command'
import chalk from 'chalk'

import { createTable } from '../../table'
import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import log from '../../logger'
import { CustomCommand } from '../../lib/CustomCommand'

const [account, currentWorkspace] = [getAccount(), getWorkspace()]

export default class WorkspaceList extends CustomCommand {
  static description = 'List workspaces on this account'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WorkspaceList)

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
}
