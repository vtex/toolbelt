import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInstall from '../modules/apps/install'

export default class Install extends CustomCommand {
  static description = 'Install an app (defaults to the app in the current directory)'

  static examples = ['vtex install', 'vtex install vtex.service-example@0.x', 'vtex install vtex.service-example@0.0.1']

  static flags = {
    ...CustomCommand.globalFlags,
    force: oclifFlags.boolean({
      char: 'f',
      description: 'Install app without checking for route conflicts',
      default: false,
    }),
  }

  static strict = false

  static args = [
    { name: 'appId', required: false },
    { name: 'ithAppId', required: false, multiple: true },
  ]

  async run() {
    const {
      raw,
      flags: { force },
    } = this.parse(Install)

    const allArgs = this.getAllArgs(raw)

    await appsInstall(allArgs, { force })
  }
}
