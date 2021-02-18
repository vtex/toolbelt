import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUninstall from '../modules/apps/uninstall'

export default class Uninstall extends CustomCommand {
  static description = 'Uninstall an app (defaults to the app in the current directory)'

  static examples = ['vtex uninstall', 'vtex uninstall vtex.service-example', 'vtex uninstall vtex.service-example@0.x']

  static flags = {
    ...CustomCommand.globalFlags,
    yes: oclifFlags.boolean({ char: 'y', description: 'Auto confirm prompts' }),
  }

  static strict = false

  static args = [
    { name: 'appName', required: false },
    { name: 'ithAppName', required: false, multiple: true },
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
