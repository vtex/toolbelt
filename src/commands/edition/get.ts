import { flags as oclifFlags } from '@oclif/command'

import { editionGet } from '../../lib/edition/get'
import { CustomCommand } from '../../utils/CustomCommand'

export default class EditionGet extends CustomCommand {
  static description = 'Get edition of the current account'

  static examples = ['vtex edition:get']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(EditionGet)

    await editionGet()
  }
}
