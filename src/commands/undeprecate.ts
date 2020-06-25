import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUndeprecate from '../modules/apps/undeprecate'

export default class Undeprecate extends CustomCommand {
  static description = 'Undeprecate app'

  static examples = ['vtex undeprecate vtex.service-example@0.0.1']

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ description: 'Confirm all prompts', char: 'y', default: false }),
  }

  static strict = false

  static args = [
    { name: 'appId', required: false },
    { name: 'ithAppId', required: false, multiple: true },
  ]

  async run() {
    const {
      raw,
      flags: { yes },
    } = this.parse(Undeprecate)

    const allArgs = this.getAllArgs(raw)

    await appsUndeprecate(allArgs, { yes })
  }
}
