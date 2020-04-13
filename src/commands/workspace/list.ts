import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import workspaceList from '../../modules/workspace/list'

export default class WorkspaceList extends CustomCommand {
  static description = 'List workspaces on this account'

  static examples = ['vtex workspace list', 'vtex workspace ls']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WorkspaceList)

    workspaceList()
  }
}
