import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsLink from '../modules/apps/link'

export default class Link extends CustomCommand {
  static description = 'Start a development session for this app'

  static examples = []

  static flags = {
    ...CustomCommand.globalFlags,
    clean: oclifFlags.boolean({ char: 'c', description: 'Clean builder cache', default: false }),
    setup: oclifFlags.boolean({
      char: 's',
      description: 'Setup typings before linking [see vtex setup --help]',
      default: false,
    }),
    'no-watch': oclifFlags.boolean({ description: "Don't watch for file changes after initial link", default: false }),
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allow links with Typescript errors', default: false }),
    verbose: oclifFlags.boolean({ char: 'v', description: 'Show more logs', default: false }),
  }

  static args = []

  async run() {
    const {
      flags,
      flags: { setup, clean, unsafe },
    } = this.parse(Link)
    const noWatch = flags['no-watch']

    await appsLink({ setup, clean, unsafe, noWatch })
  }
}
