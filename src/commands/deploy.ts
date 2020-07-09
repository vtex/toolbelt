import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsDeploy from '../modules/apps/deploy'

export default class Deploy extends CustomCommand {
  static description = 'Deploy a release of an app'

  static examples = ['vtex deploy', 'vtex deploy vtex.service-example@0.0.1']

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [{ name: 'appId' }]

  async run() {
    const {
      args: { appId },
      flags: { yes },
    } = this.parse(Deploy)

    await appsDeploy(appId, { yes })
  }
}
