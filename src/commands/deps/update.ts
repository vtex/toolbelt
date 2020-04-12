import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { workspaceDepsUpdate } from '../../lib/deps/update'

export default class DepsUpdate extends CustomCommand {
  static description = 'Update all workspace dependencies or a specific app@version'

  static examples = ['vtex deps update', 'vtex deps update vtex.service-example@0.0.1']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    name: oclifFlags.string({ char: 'n', description: 'name to print' }),
    force: oclifFlags.boolean({ char: 'f' }),
  }

  static args = [{ name: 'appId', required: false }]

  async run() {
    const {
      args: { appId },
    } = this.parse(DepsUpdate)

    await workspaceDepsUpdate(appId)
  }
}
