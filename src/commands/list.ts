import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { appsList } from '../lib/list'

export default class List extends CustomCommand {
  static description = 'List your installed VTEX apps'

  static examples = ['vtex list', 'vtex ls']

  static aliases = ['ls']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(List)

    await appsList()
  }
}
