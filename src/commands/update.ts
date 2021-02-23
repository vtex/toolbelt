import { CustomCommand } from '../api/oclif/CustomCommand'
import workspaceUpdate from '../modules/housekeeper/update'

export default class Update extends CustomCommand {
  static description = 'Updates all installed apps to the latest (minor or patch) version. Does not upgrade to another major version.'

  static examples = ['vtex update']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(Update)

    await workspaceUpdate()
  }
}
