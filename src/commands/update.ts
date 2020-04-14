import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import workspaceUpdate from '../modules/housekeeper/update'

export default class Update extends CustomCommand {
  static description = 'Update all installed apps to the latest (minor or patch) version'

  static examples = ['vtex update']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(Update)

    await workspaceUpdate()
  }
}
