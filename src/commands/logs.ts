import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsLogs from '../modules/apps/logs'

export default class Logs extends CustomCommand {
  static description = 'Show apps production logs'

  static examples = ['vtex logs', 'vtex logs appName', 'vtex logs --all', 'vtex logs appName --past']

  static flags = {
    ...CustomCommand.globalFlags,
    all: oclifFlags.boolean({ char: 'a', description: "Show all logs from this account's apps", default: false }),
    past: oclifFlags.boolean({
      char: 'p',
      description: "Show logs already seen from this account's apps",
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
