import { flags as oclifFlags } from '@oclif/command'

import { workspaceCreate } from '../../lib/workspace/create'
import { CustomCommand } from '../../utils/CustomCommand'

export default class WorkspaceCreate extends CustomCommand {
  static description = 'Create a new workspace with this name'

  static examples = ['vtex workspace create workspaceName']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    production: oclifFlags.boolean({ char: 'p', description: 'Create a production workspace', default: false }),
  }

  static args = [{ name: 'workspaceName' }]

  async run() {
    const { args, flags } = this.parse(WorkspaceCreate)
    const name = args.workspaceName
    await workspaceCreate(name, flags.production)
  }
}
