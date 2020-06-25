import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import setup from '../modules/setup'

export default class Setup extends CustomCommand {
  static description = 'Setup development enviroment'

  static flags = {
    ...CustomCommand.globalFlags,
    'ignore-linked': oclifFlags.boolean({
      char: 'i',
      description: 'Add only types from apps published',
      default: false,
    }),
    all: oclifFlags.boolean({
      description: 'Select all existing setup flags',
      default: false,
    }),
    typings: oclifFlags.boolean({
      description: 'Setup GraphQL and React typings',
      default: false,
    }),
    tooling: oclifFlags.boolean({
      description: 'Setup tools for applicable builders\nNode and React: Prettier, Husky and ESLint',
      default: false,
    }),
    tsconfig: oclifFlags.boolean({
      description: "Setup React and Node's TSconfig, if applicable",
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
