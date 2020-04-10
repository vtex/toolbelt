import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsInit } from '../../lib/apps/init'

export default class Init extends CustomCommand {
  static description = 'Create basic files and folders for your VTEX app'

  static examples = ['vtex apps:init', 'vtex init']

  static aliases = ['init']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(Init)

    await appsInit()
  }
}
