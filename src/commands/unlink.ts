import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../api/oclif/CustomCommand'
import appsUnlink from '../modules/apps/unlink'

export default class Unlink extends CustomCommand {
  static description = 'Unlinks an app from the current workspace. If not specified which app to unlink, it defaults to the app in the current directory.'

  static examples = ['vtex unlink', 'vtex unlink vtex.service-example@0.x']

  static flags = {
    ...CustomCommand.globalFlags,
    all: oclifFlags.boolean({ char: 'a', description: 'Unlinks all apps.', default: false }),
  }

  static strict = false

  static args = [
    { name: 'appId', required: false, description: 'Name of the app to unlink.' },
    { name: 'ithAppId', required: false, multiple: true, description: 'Names of the multiple apps to unlink.' },
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
