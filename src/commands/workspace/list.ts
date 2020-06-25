import { CustomCommand } from '../../api/oclif/CustomCommand'
import workspaceList from '../../modules/workspace/list'

export default class WorkspaceList extends CustomCommand {
  static description = 'List workspaces on this account'

  static aliases = ['workspace:ls']

  static examples = ['vtex workspace list', 'vtex workspace ls']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(WorkspaceList)

    workspaceList()
  }
}
