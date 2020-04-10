import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { workspaceUpdate } from '../../lib/workspace/update'

export default class Update extends CustomCommand {
  static description = 'Update all installed apps to the latest (minor or patch) version'

  static aliases = ['update']

  static examples = ['vtex workspace:update', 'vtex update']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(Update)

    await workspaceUpdate()
  }
}
