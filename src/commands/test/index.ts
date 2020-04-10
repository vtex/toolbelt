import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { testCommand } from '../../lib/test'

export default class Test extends CustomCommand {
  static description = 'Run your VTEX app unit tests'

  static examples = []

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    unsafe: oclifFlags.boolean({ char: 'u', description: 'Allow tests with Typescript errors', default: false }),
  }

  static args = []

  async run() {
    const {
      flags: { unsafe },
    } = this.parse(Test)

    await testCommand(unsafe)
  }
}
