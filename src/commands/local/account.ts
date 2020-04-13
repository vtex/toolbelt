import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import authAccount from '../../modules/local/account'

export default class LocalAccount extends CustomCommand {
  static description = 'Show current account and copy it to clipboard'

  static examples = ['vtex local account']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    authAccount()
  }
}
