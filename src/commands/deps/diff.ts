import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import { getWorkspace } from '../../conf'
import workspaceDepsDiff from '../../modules/deps/diff'

export default class DepsDiff extends CustomCommand {
  static description =
    'Diff between workspace dependencies. If only a parameter is passed the current workspace is used in the diff and if no parameter is passed the diff is made between the current workspace and master'

  static examples = ['vtex deps diff workspace1 workspace2']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'workspace1', required: false, default: getWorkspace() },
    { name: 'workspace2', required: false, default: 'master' },
  ]

  async run() {
    const {
      args: { workspace1, workspace2 },
    } = this.parse(DepsDiff)

    await workspaceDepsDiff(workspace1, workspace2)
  }
}
