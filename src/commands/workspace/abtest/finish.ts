import testAbFinish from '../../../modules/workspace/abtest/finish'
import { CustomCommand } from '../../../api/oclif/CustomCommand'

export default class ABTestFinish extends CustomCommand {
  static description = 'Stop all AB testing in current account'

  static examples = []

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(ABTestFinish)

    await testAbFinish()
  }
}
