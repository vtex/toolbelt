import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUninstall from '../modules/apps/uninstall'

import { ColorifyConstants } from '../api/constants/Colors'

export default class Uninstall extends CustomCommand {
  static description = `Uninstalls an app from the current ${ColorifyConstants.ID('workspace.')} If not specified which app to uninstall, it defaults to the app in the current directory.`

  static examples = [`${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex uninstall')}`, `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex uninstall')} vtex.service-example`, `${ColorifyConstants.COMMAND_OR_VTEX_REF('vtex uninstall')} vtex.service-example@0.x`]

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ char: 'y', description: 'Answers yes to all prompts.' }),
  }

  static strict = false

  static args = [
    { name: 'appName', required: false, description: 'Name of the app to uninstall.' },
    { name: 'ithAppName', required: false, multiple: true, description: 'Names of the multiple apps to uninstall.' },
  ]

  async run() {
    const {
      raw,
      flags: { yes },
    } = this.parse(Uninstall)

    const allArgs = this.getAllArgs(raw)

    await appsUninstall(allArgs, { yes })
  }
}
