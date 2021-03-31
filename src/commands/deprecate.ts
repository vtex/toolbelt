import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsDeprecate from '../modules/apps/deprecate'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Deprecate extends CustomCommand {
  static description = `Deprecates the specified app, uninstalling and downgrading it to the latest stable version in every ${ColorifyConstants.ID(
    'VTEX account.'
  )}`

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex deprecate')}`,
    `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex deprecate')} vtex.service-example@0.0.1`,
  ]

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ description: 'Answers yes to all prompts.', char: 'y', default: false }),
  }

  static strict = false

  static args = [
    {
      name: 'appId',
      required: false,
      description: `Name and version of the app ${ColorifyConstants.ID('({vendor}.{appname}@{x.x.x})')} to deprecate.`,
    },
    {
      name: 'ithAppId',
      required: false,
      multiple: true,
      description: `Names and versions of multiple apps ${ColorifyConstants.ID(
        '({vendor}.{appname}@{x.x.x})'
      )} to deprecate.`,
    },
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
