import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsLogs from '../modules/apps/logs'

export default class Logs extends CustomCommand {
  static description = 'Show logs of an app on the current directory or a specified one'

  static examples = ['vtex logs', 'vtex logs appName', 'vtex logs --all', 'vtex logs appName --past']

  static flags = {
    ...CustomCommand.globalFlags,
    all: oclifFlags.boolean({ char: 'a', description: 'Show logs of all apps of this account', default: false }),
    past: oclifFlags.boolean({
      char: 'p',
      description: 'Show logs already seen for this account',
      default: false,
    }),
  }

  static args = [{ name: 'app', required: false }]

  async run() {
    const {
      args: { app },
      flags,
    } = this.parse(Logs)

    await appsLogs(app, flags)
  }
}
