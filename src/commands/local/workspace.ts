import { CustomCommand } from '../../api/oclif/CustomCommand'
import authWorkspace from '../../modules/local/workspace'

export default class LocalWorkspace extends CustomCommand {
  static description = 'Show current workspace and copy it to clipboard'

  static examples = ['vtex local workspace']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(LocalWorkspace)

    authWorkspace()
  }
}
