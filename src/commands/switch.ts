import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authSwitch from '../modules/auth/switch'

export default class Switch extends CustomCommand {
  static description = 'Switch to another VTEX account'

  static examples = ['vtex switch storecomponents', 'vtex switch storecomponents myworkspace']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    workspace: oclifFlags.string({ char: 'w', description: 'Specify login workspace' }),
  }

  static args = [{ name: 'account', required: true }]

  async run() {
    const {
      args: { account },
      flags: { workspace },
    } = this.parse(Switch)

    await authSwitch(account, { workspace })
  }
}
