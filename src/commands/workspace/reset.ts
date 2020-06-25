import { flags as oclifFlags } from '@oclif/command'

import workspaceReset from '../../modules/workspace/reset'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class WorkspaceReset extends CustomCommand {
  static description = 'Delete and recreate a workspace'

  static examples = ['vtex workspace reset', 'vtex workspace reset workspaceName']

  static flags = {
    ...CustomCommand.globalFlags,
    production: oclifFlags.boolean({
      char: 'p',
      description: 'Re-create the workspace as a production one',
      default: false,
    }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [{ name: 'workspaceName', required: false }]

  async run() {
    const {
      args: { workspaceName },
      flags: { yes, production },
    } = this.parse(WorkspaceReset)

    await workspaceReset(workspaceName, { yes, production })
  }
}
