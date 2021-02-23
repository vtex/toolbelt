import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUninstall from '../modules/apps/uninstall'

export default class Uninstall extends CustomCommand {
  static description = 'Uninstalls an app from the current account and workspace. If not specified which app to uninstall, it defaults to the app in the current directory.'

  static examples = ['vtex uninstall', 'vtex uninstall vtex.service-example', 'vtex uninstall vtex.service-example@0.x']

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
