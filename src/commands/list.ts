import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsList from '../modules/apps/list'

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
