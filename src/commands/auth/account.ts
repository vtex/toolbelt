import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { authAccount } from '../../lib/auth/account'

export default class LocalAccount extends CustomCommand {
  static description = 'Show current account and copy it to clipboard'

  static aliases = ['account']

  static examples = ['vtex auth:account', 'vtex account']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    authAccount()
  }
}
