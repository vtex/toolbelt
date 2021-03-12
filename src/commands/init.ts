import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInit from '../modules/init'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Init extends CustomCommand {
  static description = `Copies starting files and folders from ${ColorifyConstants.ID(
    'VTEX'
  )} boilerplates into your local directories.`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex init project-name')}`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'projectName', required: false }]

  async run() {
    const {
      args: { projectName },
    } = this.parse(Init)

    await appsInit(projectName)
  }
}
