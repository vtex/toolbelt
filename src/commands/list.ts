import { CustomCommand } from '../api/oclif/CustomCommand'
import appsList from '../modules/apps/list'

import { ColorifyConstants } from '../api/constants/Colors'

export default class List extends CustomCommand {
  static description = `Lists the apps installed on the current ${ColorifyConstants.ID(
    'workspace'
  )} and ${ColorifyConstants.ID('account')}.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex list')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex ls')}`,
  ]

  static aliases = ['ls']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(List)

    await appsList()
  }
}
