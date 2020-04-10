import { flags as oclifFlags } from '@oclif/command'

import { authSupport } from '../../lib/auth/support'
import { CustomCommand } from '../../utils/CustomCommand'

export default class Support extends CustomCommand {
  static description = 'Login as support into another VTEX account'

  static aliases = ['support']

  static examples = ['vtex auth:support storecomponents', 'vtex auth:support']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'account', required: true }]

  async run() {
    const {
      args: { account },
    } = this.parse(Support)

    await authSupport(account)
  }
}
