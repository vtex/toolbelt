import { flags } from '@oclif/command'

import { greeting } from '../../greeting'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'

export default class WhoAmI extends CustomCommand {
  static description = 'See your credentials current status'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(WhoAmI)
    const lines = await greeting()
  lines.forEach((msg: string) => log.info(msg))
  }
}
