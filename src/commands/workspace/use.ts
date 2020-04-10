import { flags as oclifFlags } from '@oclif/command'

import { workspaceUse } from '../../lib/workspace/use'
import { CustomCommand } from '../../utils/CustomCommand'

export default class WorkspaceUse extends CustomCommand {
  static description = 'Use a workspace to perform operations'

  static examples = ['vtex workspace use workspaceName', 'vtex use worspaceName']

  static aliases = ['use']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    production: oclifFlags.boolean({
      char: 'p',
      description: 'Create the workspace as production if it does not exist or is reset',
    }),
    reset: oclifFlags.boolean({ char: 'r', description: 'Resets workspace before using it', default: false }),
  }

  static args = [{ name: 'workspace', required: true }]

  async run() {
    const { args: { workspace }, flags: { production, reset } } = this.parse(WorkspaceUse)

    await workspaceUse(workspace, production, reset)
  }
}
