import { flags as oclifFlags } from '@oclif/command'

import testAbStart from '../../../modules/workspace/abtest/start'
import { CustomCommand } from '../../../oclif/CustomCommand'

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
