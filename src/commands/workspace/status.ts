import { flags as oclifFlags } from '@oclif/command'
import { CustomCommand } from '../../utils/CustomCommand'
import { workspaceStatus } from '../../lib/workspace/status'

export default class WorkspaceStatus extends CustomCommand {
  static description = 'Display information about a workspace'

  static examples = ['vtex workspace:status']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'workspaceName', required: false }]

  async run() {
    const { args: workspaceName } = this.parse(WorkspaceStatus)

    await workspaceStatus(workspaceName)
  }
}
