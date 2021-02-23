import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { switchAccount } from '../api/modules/auth/switch'

export default class Switch extends CustomCommand {
  static description = 'Switches to another VTEX account.'

  static examples = ['vtex switch storecomponents']

  static flags = {
    ...CustomCommand.globalFlags,
    workspace: oclifFlags.string({ char: 'w', description: 'Moves to the specified workspace.' }),
  }

  static args = [{ name: 'account', required: true, description: 'Account name to log in.' }]

  async run() {
    const {
      args: { account },
      flags: { workspace },
    } = this.parse(Switch)

    await switchAccount(account, { workspace, showWelcomeMessage: true })
  }
}
