import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authSwitch from '../modules/auth/switch'

export default class Switch extends CustomCommand {
  static description = 'Switch to another VTEX account'

  static examples = ['vtex switch storecomponents', 'vtex switch storecomponents myworkspace']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'account', required: true },
    { name: 'workspace', required: false, default: 'master' },
  ]

  async run() {
    const {
      args: { account, workspace },
    } = this.parse(Switch)

    await authSwitch(account, { workspace })
  }
}
