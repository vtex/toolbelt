import { CustomCommand } from '../api/oclif/CustomCommand'
import appsList from '../modules/apps/list'

export default class List extends CustomCommand {
  static description = 'Lists the apps installed on the current workspace and account.'

  static examples = ['vtex list', 'vtex ls']

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
