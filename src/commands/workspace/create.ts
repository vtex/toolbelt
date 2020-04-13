import { flags as oclifFlags } from '@oclif/command'

import workspaceCreate from '../../modules/workspace/create'
import { CustomCommand } from '../../oclif/CustomCommand'

export default class WorkspaceCreate extends CustomCommand {
  static description = 'Create a new workspace with this name'

  static examples = ['vtex workspace create workspaceName']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    production: oclifFlags.boolean({ char: 'p', description: 'Create a production workspace', default: false }),
  }

  static args = [{ name: 'workspaceName' }]

  async run() {
    const {
      args,
      flags: { production },
    } = this.parse(WorkspaceCreate)
    const name = args.workspaceName
    await workspaceCreate(name, { production })
  }
}
