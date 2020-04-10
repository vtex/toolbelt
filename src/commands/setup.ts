import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { setup } from '../lib/setup'

export default class Setup extends CustomCommand {
  static description = 'Download react app typings, graphql app typings, lint config and tsconfig'

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    'ignore-linked': oclifFlags.boolean({
      char: 'i',
      description: 'Add only types from apps published',
      default: false,
    }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(Setup)
    const ignoreLinked = flags['ignore-linked']

    await setup(ignoreLinked)
  }
}
