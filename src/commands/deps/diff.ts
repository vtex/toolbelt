import { CustomCommand } from '../../api/oclif/CustomCommand'
import workspaceDepsDiff from '../../modules/deps/diff'
import { SessionManager } from '../../api/session/SessionManager'

export default class DepsDiff extends CustomCommand {
  static description =
    'Diff between workspace dependencies. If only a parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master'

  static examples = ['vtex deps diff workspace1 workspace2']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [
    { name: 'workspace1', required: false, default: SessionManager.getSingleton().workspace },
    { name: 'workspace2', required: false, default: 'master' },
  ]

  async run() {
    const {
      args: { workspace1, workspace2 },
    } = this.parse(DepsDiff)

    await workspaceDepsDiff(workspace1, workspace2)
  }
}
