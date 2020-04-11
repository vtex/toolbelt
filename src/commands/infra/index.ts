import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'

export default class Infra extends CustomCommand {
  static description = 'Infra commands'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {}
}
