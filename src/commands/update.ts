import { CustomCommand } from '../api/oclif/CustomCommand'
import workspaceUpdate from '../modules/housekeeper/update'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Update extends CustomCommand {
  static description =
    'Updates all installed apps to the latest (minor or patch) version. Does not upgrade to another major version.'

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex update')}`]

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(Update)

    await workspaceUpdate()
  }
}
