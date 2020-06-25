import { flags as oclifFlags } from '@oclif/command'

import { workspaceCreator } from '../../modules/workspace/create'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class WorkspaceCreate extends CustomCommand {
  static description = 'Create a new workspace'

  static examples = ['vtex workspace create workspaceName']

  static flags = {
    ...CustomCommand.globalFlags,
    production: oclifFlags.boolean({ char: 'p', description: 'Create a production workspace', default: false }),
  }

  static args = [{ name: 'workspaceName' }]

  async run() {
    const {
      args: { workspaceName },
      flags: { production },
    } = this.parse(WorkspaceCreate)

    await workspaceCreator({
      targetWorkspace: workspaceName,
      promptCreation: false,
      logIfAlreadyExists: true,
      productionWorkspace: production,
    })
  }
}
