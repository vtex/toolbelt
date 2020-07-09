import { CustomCommand } from '../api/oclif/CustomCommand'
import authWhoami from '../modules/auth/whoami'

export default class WhoAmI extends CustomCommand {
  static description = 'See your credentials current status'

  static examples = ['vtex whoami']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(WhoAmI)

    await authWhoami()
  }
}
