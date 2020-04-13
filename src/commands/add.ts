import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import appsAdd from '../modules/apps/add'

export default class Add extends CustomCommand {
  static description = 'Add app(s) to the manifest dependencies'

  static examples = ['vtex apps add vtex.service-example@0.x', 'vtex add vtex.service-example@0.x']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'appId', required: true }]

  async run() {
    const {
      args: { appId },
    } = this.parse(Add)

    await appsAdd(appId, [])
  }
}
