import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { appLink } from '../modules/apps/link'

export default class Link extends CustomCommand {
  static description = 'Start a development session for this app'

  static examples = ['vtex link -a youraccount -w yourworkspace']

  static flags = {
    ...CustomCommand.globalFlags,
    account: oclifFlags.string({
      char: 'a',
      description: `Account to login before linking the app. This flag has to be paired with the '--workspace' flag.`,
      required: false,
      dependsOn: ['workspace'],
    }),
    clean: oclifFlags.boolean({ char: 'c', description: 'Clean builder cache', default: false }),
    setup: oclifFlags.boolean({
      char: 's',
      description: 'Setup typings before linking [see vtex setup --help]',
      default: false,
    }),
    'no-watch': oclifFlags.boolean({ description: "Don't watch for file changes after initial link", default: false }),
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allow links with Typescript errors', default: false }),
    workspace: oclifFlags.string({
      char: 'w',
      description: `Workspace to switch to before linking the app. Can be paired with the '--account' flag to change account and switch to the given workspace.`,
      required: false,
    }),
  }

  static args = []

  async run() {
    const {
      flags,
      flags: { account, setup, clean, unsafe, workspace },
    } = this.parse(Link)
    const noWatch = flags['no-watch']
    await appLink({ account, workspace, setup, clean, unsafe, noWatch })
  }
}
