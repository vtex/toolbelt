import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import authWorkspace from '../../modules/local/workspace'

export default class LocalWorkspace extends CustomCommand {
  static description = 'Show current workspace and copy it to clipboard'

  static examples = ['vtex local workspace']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(LocalWorkspace)

    authWorkspace()
  }
}
