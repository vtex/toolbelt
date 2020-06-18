import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsLink from '../modules/apps/link'
import authLogin from '../modules/auth/login'

export default class Link extends CustomCommand {
  static description = 'Start a development session for this app'

  static examples = ['vtex link -a youraccount -w yourworkspace']

  static flags = {
    ...CustomCommand.globalFlags,
    account: oclifFlags.string({ char: 'a', description: 'Account to login', required: false }),
    clean: oclifFlags.boolean({ char: 'c', description: 'Clean builder cache', default: false }),
    setup: oclifFlags.boolean({
      char: 's',
      description: 'Setup typings before linking [see vtex setup --help]',
      default: false,
    }),
    'no-watch': oclifFlags.boolean({ description: "Don't watch for file changes after initial link", default: false }),
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allow links with Typescript errors', default: false }),
    workspace: oclifFlags.string({ char: 'w', description: 'Workspace to login into', required: false }),
  }

  static args = []

  async run() {
    const {
      flags,
      flags: { account, setup, clean, unsafe, workspace },
    } = this.parse(Link)
    const noWatch = flags['no-watch']

    if (account && workspace) {
      await authLogin({ account, workspace })
    }

    await appsLink({ setup, clean, unsafe, noWatch })
  }
}
