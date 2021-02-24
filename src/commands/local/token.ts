import { CustomCommand } from '../../api/oclif/CustomCommand'
import authToken from '../../modules/local/token'

import { ColorifyConstants } from '../../api/constants/Colors'

export default class LocalToken extends CustomCommand {
  static description = `Prints the ${ColorifyConstants.ID('user\'s auth token')} and copies it to the clipboard.`

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex local token')}`]

  static flags = {
    ...CustomCommand.globalFlags,
  }

  async run() {
    authToken()
  }
}
