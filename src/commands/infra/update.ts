import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import workspaceInfraUpdate from '../../modules/infra/update'

export default class InfraUpdateCommand extends CustomCommand {
  static description = 'Update all installed infra services'

  static examples = ['vtex infra update']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(InfraUpdateCommand)

    await workspaceInfraUpdate()
  }
}
