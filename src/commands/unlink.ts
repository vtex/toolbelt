import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUnlink from '../modules/apps/unlink'

export default class Unlink extends CustomCommand {
  static description = 'Unlink an app on the current directory or a specified one'

  static examples = ['vtex unlink', 'vtex unlink vtex.service-example@0.x']

  static flags = {
    ...CustomCommand.globalFlags,
    all: oclifFlags.boolean({ char: 'a', description: 'Unlink all apps', default: false }),
  }

  static strict = false

  static args = [
    { name: 'appId', required: false },
    { name: 'ithAppId', required: false, multiple: true },
  ]

  async run() {
    const {
      raw,
      flags: { all },
    } = this.parse(Unlink)

    const allArgs = this.getAllArgs(raw)

    await appsUnlink(allArgs, { all })
  }
}
