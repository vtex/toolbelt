import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authSupport from '../modules/support/login'

export default class Support extends CustomCommand {
  static description = 'Login as support into another VTEX account'

  static examples = ['vtex support storecomponents']

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
