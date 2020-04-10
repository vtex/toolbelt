import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { authSupport } from '../lib/support'

export default class Support extends CustomCommand {
  static description = 'Login as support into another VTEX account'

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
