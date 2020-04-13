import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authWhoami from '../modules/auth/whoami'

export default class WhoAmI extends CustomCommand {
  static description = 'See your credentials current status'

  static examples = ['vtex whoami']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WhoAmI)

    await authWhoami()
  }
}
