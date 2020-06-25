import workspacePromote from '../../modules/workspace/promote'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class WorkspacePromote extends CustomCommand {
  static description = 'Promote this workspace to master'

  static aliases = ['promote']

  static examples = ['vtex workspace promote', 'vtex promote']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(WorkspacePromote)

    await workspacePromote()
  }
}
