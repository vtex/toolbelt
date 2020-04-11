import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'

export default class Test extends CustomCommand {
  static description = 'Test commands'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {}
}
