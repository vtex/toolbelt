import { flags as oclifFlags } from '@oclif/command'

import { greeting } from '../../greeting'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'

export default class WhoAmI extends CustomCommand {
  static description = 'See your credentials current status'

  static aliases = ['whoami']

  static examples = ['vtex auth:whoami', 'vtex whoami']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WhoAmI)
    const lines = await greeting()
    lines.forEach((msg: string) => log.info(msg))
  }
}
