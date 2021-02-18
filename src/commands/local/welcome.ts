import { CustomCommand } from '../../api/oclif/CustomCommand'
import welcome from '../../modules/auth/welcome'

export default class Welcome extends CustomCommand {
  static description = 'Gives some commonly sought-after info after you log in'

  static examples = ['vtex welcome', 'vtex local welcome']

  static aliases = ['welcome']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    return welcome()
  }
}
