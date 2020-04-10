import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { editionSet } from '../../lib/edition/set'

export default class EditionSet extends CustomCommand {
  static description = 'Set edition of the current account'

  static examples = ['vtex edition set editionName']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'edition', required: true }]

  async run() {
    const {
      args: { edition },
    } = this.parse(EditionSet)

    await editionSet(edition)
  }
}
