import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsUninstall from '../modules/apps/uninstall'

export default class Uninstall extends CustomCommand {
  static description = 'Uninstall an app (defaults to the app in the current directory)'

  static examples = ['vtex uninstall', 'vtex uninstall vtex.service-example', 'vtex uninstall vtex.service-example@0.x']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Auto confirm prompts' }),
  }

  static args = [{ name: 'appName', required: false }]

  async run() {
    const {
      args: { appName },
      flags: { yes },
    } = this.parse(Uninstall)

    await appsUninstall(appName, { yes })
  }
}
