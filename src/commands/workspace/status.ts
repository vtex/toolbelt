import { CustomCommand } from '../../api/oclif/CustomCommand'
import workspaceStatus from '../../modules/workspace/status'

export default class WorkspaceStatus extends CustomCommand {
  static description = 'Display information about a workspace'

  static examples = ['vtex workspace status']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'workspaceName', required: false }]

  async run() {
    const {
      args: { workspaceName },
    } = this.parse(WorkspaceStatus)

    await workspaceStatus(workspaceName)
  }
}
