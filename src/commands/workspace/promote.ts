import { flags as oclifFlags } from '@oclif/command'

import { workspacePromote } from '../../lib/workspace/promote'
import { CustomCommand } from '../../utils/CustomCommand'

export default class WorkspacePromote extends CustomCommand {
  static description = 'Promote this workspace to master'

  static examples = ['vtex workspace:promote', 'vtex promote']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WorkspacePromote)

    await workspacePromote()
  }
}
