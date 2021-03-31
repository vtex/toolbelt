import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUndeprecate from '../modules/apps/undeprecate'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Undeprecate extends CustomCommand {
  static description = 'Reestablishes a deprecated version of an app as a stable version.'

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex undeprecate')} vtex.service-example@0.0.1`]

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ description: 'Answers yes to all prompts.', char: 'y', default: false }),
  }

  static strict = false

  static args = [
    {
      name: 'appId',
      required: false,
      description: `Name and version of the app ${ColorifyConstants.ID(
        '({vendor}.{appname}@{x.x.x})'
      )} to undeprecate.`,
    },
    {
      name: 'ithAppId',
      required: false,
      multiple: true,
      description: `Names and versions of the multiple apps ${ColorifyConstants.ID(
        '({vendor}.{appname}@{x.x.x})'
      )} to undeprecate.`,
    },
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
