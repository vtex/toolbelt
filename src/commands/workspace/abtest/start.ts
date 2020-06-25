import testAbStart from '../../../modules/workspace/abtest/start'
import { CustomCommand } from '../../../api/oclif/CustomCommand'

export default class ABTestStart extends CustomCommand {
  static description = 'Start AB testing with current workspace'

  static examples = []

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(ABTestStart)

    await testAbStart()
  }
}
