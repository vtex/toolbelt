import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsDeploy } from '../../lib/apps/deploy'

export default class Deploy extends CustomCommand {
  static description = 'Deploy a release of an app'

  static aliases = ['deploy']

  static examples = ['vtex apps:deploy', 'vtex deploy', 'vtex deploy vtex.service-example@0.0.1']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [{ name: 'appId' }]

  async run() {
    const {
      args: { appId },
      flags: { yes },
    } = this.parse(Deploy)

    await appsDeploy(appId, yes)
  }
}
