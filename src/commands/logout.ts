import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authLogout from '../modules/auth/logout'

export default class Logout extends CustomCommand {
  static description = 'Logout of the current VTEX account'

  static examples = ['vtex logout']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    authLogout()
  }
}
