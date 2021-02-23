import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import { appLink } from '../modules/apps/link'

export default class Link extends CustomCommand {
  static description = 'Syncs the app in the current directory with the VTEX cloud development environment.'

  static examples = ['vtex link -a youraccount -w yourworkspace']

  static flags = {
    ...CustomCommand.globalFlags,
    account: oclifFlags.string({
      char: 'a',
      description: `Starts a development session in the specified account. Must be paired with the '--workspace' flag.`,
      required: false,
      dependsOn: ['workspace'],
    }),
    clean: oclifFlags.boolean({ char: 'c', description: 'Cleans builder cache', default: false }),
    setup: oclifFlags.boolean({
      char: 's',
      description: 'Sets up typing definitions before linking the app [see vtex setup --help].',
      default: false,
    }),
    'no-watch': oclifFlags.boolean({ description: "Doesn't watch for file changes after the initial link.", default: false }),
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allows linking the app despite Typescript errors.', default: false }),
    workspace: oclifFlags.string({
      char: 'w',
      description: `Starts a development session in the specified workspace. Can be paired with the '--account' flag to switch from the current account and workspace.`,
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
