import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { switchAccount } from '../api/modules/auth/switch'

export default class Switch extends CustomCommand {
  static description = 'Switch to another VTEX account'

  static examples = ['vtex switch storecomponents']

  static flags = {
    ...CustomCommand.globalFlags,
    workspace: oclifFlags.string({ char: 'w', description: 'Specify login workspace' }),
  }

  static args = [{ name: 'account', required: true }]

  async run() {
    const {
      args: { account },
      flags: { workspace },
    } = this.parse(Switch)

    await switchAccount(account, { workspace, showWelcomeMessage: true })
  }
}
