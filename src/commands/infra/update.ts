import { CustomCommand } from '../../api/oclif/CustomCommand'
import workspaceInfraUpdate from '../../modules/infra/update'

export default class InfraUpdateCommand extends CustomCommand {
  static description = 'Update all installed infra services'

  static examples = ['vtex infra update']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(InfraUpdateCommand)

    await workspaceInfraUpdate()
  }
}
