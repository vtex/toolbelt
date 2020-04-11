import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'

export default class Local extends CustomCommand {
  static description = 'Local commands'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {}
}
