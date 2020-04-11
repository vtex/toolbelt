import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'

export default class Workspace extends CustomCommand {
  static description = 'Workspace commands'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {}
}
