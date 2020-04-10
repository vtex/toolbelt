import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { workspaceInfraUpdate } from '../../lib/infra/update'

export default class InfraUpdateCommand extends CustomCommand {
  static description = 'Update all installed infra services'

  static examples = ['vtex workspace:infra:update', 'vtex infra:update']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(InfraUpdateCommand)

    await workspaceInfraUpdate()
  }
}
