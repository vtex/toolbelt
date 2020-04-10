import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { appsUndeprecate } from '../lib/undeprecate'

export default class Undeprecate extends CustomCommand {
  static description = 'Undeprecate app'

  static examples = ['vtex undeprecate vtex.service-example@0.0.1']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    yes: oclifFlags.boolean({ description: 'Confirm all prompts', char: 'y', default: false }),
  }

  static args = [{ name: 'appId', required: true }]

  async run() {
    const {
      args: { appId },
      flags: { yes },
    } = this.parse(Undeprecate)

    await appsUndeprecate(appId, yes)
  }
}
