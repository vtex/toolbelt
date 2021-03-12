import { CustomCommand } from '../api/oclif/CustomCommand'
import authLogout from '../modules/auth/logout'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Logout extends CustomCommand {
  static description = `Logs out of the current ${ColorifyConstants.ID('VTEX account')}.`

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex logout')}`]

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  run() {
    return authLogout()
  }
}
