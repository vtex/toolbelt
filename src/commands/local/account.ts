import { CustomCommand } from '../../api/oclif/CustomCommand'
import authAccount from '../../modules/local/account'

export default class LocalAccount extends CustomCommand {
  static description = 'Show current account and copy it to clipboard'

  static examples = ['vtex local account']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    authAccount()
  }
}
