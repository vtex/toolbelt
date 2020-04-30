import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsLogs from '../modules/apps/logs'

export default class Logs extends CustomCommand {
  static description = 'Show logs of an app on the current directory or a specified one'

  static examples = ['vtex logs']

  static flags = {
    ...CustomCommand.globalFlags,
    all: oclifFlags.boolean({ char: 'a', description: 'Show logs of all apps of this vendor', default: false }),
    ghost: oclifFlags.boolean({ char: 'g', description: 'Show logs of all apps of this vendor', default: false }),
  }

  static args = [
    { name: 'vendor', required: false },
    { name: 'app', required: false },
  ]

  async run() {
    const {
      args: { app, vendor },
      flags,
    } = this.parse(Logs)

    await appsLogs(vendor, app, flags)
  }
}
