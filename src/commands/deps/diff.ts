import { CustomCommand } from '../../utils/CustomCommand'
import { getWorkspace } from '../../utils/conf'
import { workspaceDepsDiff } from '../../lib/deps/diff'

export default class DepsDiff extends CustomCommand {
  static description =
    'Diff between workspace dependencies. If only a parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master.'

  static aliases = ['diff']

  static examples = [
    'vtex workspace:diff workspace1 workspace2',
    'vtex diff workspace1 workspace2',
    'vtex diff workspace1',
    'vtex diff',
  ]

  static flags = {}

  static args = [
    { name: 'workspace1', required: false, default: getWorkspace() },
    { name: 'workspace2', required: false, default: 'master' },
  ]

  async run() {
    const { args: { workspace1, workspace2 } } = this.parse(DepsDiff)

    await workspaceDepsDiff(workspace1, workspace2)
  }
}
