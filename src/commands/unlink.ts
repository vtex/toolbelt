import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { appsUnlink } from '../lib/unlink'

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
      args: { appId },
      flags: { all },
    } = this.parse(Unlink)

    await appsUnlink(appId, all)
  }
}
