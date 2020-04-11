import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'

export default class Config extends CustomCommand {
  static description = 'Config commands'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {}
}
