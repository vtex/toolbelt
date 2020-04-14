import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsUnlink from '../modules/apps/unlink'

export default class Unlink extends CustomCommand {
  static description = 'Unlink an app on the current directory or a specified one'

  static examples = ['vtex unlink', 'vtex unlink vtex.service-example@0.x']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    all: oclifFlags.boolean({ char: 'a', description: 'Unlink all apps', default: false }),
  }

  static args = [{ name: 'appId', required: false }]

  async run() {
    const {
      raw,
      args: { appId },
      flags: { all },
    } = this.parse(Unlink)

    const allArgs = this.getAllArgs(raw)

    await appsUnlink(appId, { _: allArgs, all })
  }
}
