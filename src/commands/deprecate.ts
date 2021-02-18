import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsDeprecate from '../modules/apps/deprecate'

export default class Deprecate extends CustomCommand {
  static description = 'Deprecate an app'

  static examples = ['vtex deprecate', 'vtex deprecate vtex.service-example@0.0.1']

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
    } = this.parse(Deprecate)

    const allArgs = this.getAllArgs(raw)

    await appsDeprecate(allArgs, { yes })
  }
}
