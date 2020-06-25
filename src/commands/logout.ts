import { CustomCommand } from '../api/oclif/CustomCommand'
import authLogout from '../modules/auth/logout'

export default class Logout extends CustomCommand {
  static description = 'Logout of the current VTEX account'

  static examples = ['vtex logout']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    authLogout()
  }
}
