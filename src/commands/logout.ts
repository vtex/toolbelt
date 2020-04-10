import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { authLogout } from '../lib/logout'

export default class Logout extends CustomCommand {
  static description = 'Logout of the current VTEX account'

  static aliases = ['logout']

  static examples = ['vtex auth:logout', 'vtex logout']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    authLogout()
  }
}
