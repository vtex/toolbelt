import { flags as oclifFlags } from '@oclif/command'

import { testAbStart } from '../../../lib/test/ab/start'
import { CustomCommand } from '../../../utils/CustomCommand'

export default class ABTestStart extends CustomCommand {
  static description = 'Start AB testing with current workspace'

  static examples = []

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(ABTestStart)

    await testAbStart()
  }
}
