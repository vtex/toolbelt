import { flags as oclifFlags } from '@oclif/command'

import { workspaceInfo } from '../../lib/workspace/info'
import { CustomCommand } from '../../utils/CustomCommand'

export default class WorkspaceInfo extends CustomCommand {
  static description = 'Display information about the current workspace'

  static aliases = ['info']

  static examples = ['vtex workspace:info', 'vtex info']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WorkspaceInfo)

    await workspaceInfo()
  }
}
