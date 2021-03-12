import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import setup from '../modules/setup'

export default class Setup extends CustomCommand {
  static description = 'Sets up typings and tools for the current development environment.'

  static flags = {
    ...CustomCommand.globalFlags,
    'ignore-linked': oclifFlags.boolean({
      char: 'i',
      description: 'Sets up types from published apps while ignoring types from linked apps.',
      default: false,
    }),
    all: oclifFlags.boolean({
      description: 'Sets up all available typings, configs, and tools.',
      default: false,
    }),
    typings: oclifFlags.boolean({
      description: 'Sets up GraphQL and React typings.',
      default: false,
    }),
    tooling: oclifFlags.boolean({
      description: 'Sets up Prettier, Husky, and ESLint.',
      default: false,
    }),
    tsconfig: oclifFlags.boolean({
      description: 'Sets up React and Node TSconfig, if applicable.',
      default: false,
    }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(Setup)
    const ignoreLinked = flags['ignore-linked']

    await setup({ ...flags, i: ignoreLinked })
  }
}
