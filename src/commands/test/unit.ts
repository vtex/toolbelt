import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../api/oclif/CustomCommand'
import testCommand from '../../modules/apps/testCommand'

export default class UnitTest extends CustomCommand {
  static description = 'Run your VTEX app unit tests'

  static aliases = ['test']

  static examples = []

  static flags = {
    ...CustomCommand.globalFlags,
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allow tests with Typescript errors', default: false }),
  }

  static args = []

  async run() {
    const {
      flags: { unsafe },
    } = this.parse(UnitTest)

    await testCommand({ unsafe })
  }
}
