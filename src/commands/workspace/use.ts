import { flags as oclifFlags } from '@oclif/command'

import workspaceUse from '../../modules/workspace/use'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class WorkspaceUse extends CustomCommand {
  static description = 'Use a workspace to perform operations'

  static examples = ['vtex workspace use workspaceName', 'vtex use workspaceName']

  static aliases = ['use']

  static flags = {
    ...CustomCommand.globalFlags,
    production: oclifFlags.boolean({
      char: 'p',
      description: 'Create the workspace as production if it does not exist or is reset',
      default: false,
    }),
    reset: oclifFlags.boolean({ char: 'r', description: 'Resets workspace before using it', default: false }),
  }

  static args = [{ name: 'workspace', required: true }]

  async run() {
    const {
      args: { workspace },
      flags: { production, reset },
    } = this.parse(WorkspaceUse)

    await workspaceUse(workspace, { production, reset })
  }
}
