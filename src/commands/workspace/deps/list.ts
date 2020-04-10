import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../../utils/CustomCommand'
import { workspaceDepsList } from '../../../lib/workspace/deps/list'

export default class DepsList extends CustomCommand {
  static aliases = ['workspace:deps:ls', 'deps:list', 'deps:ls']

  static description = 'List your workspace dependencies'

  static examples = ['vtex workspace:deps:list', 'vtex workspace:deps:ls', 'vtex deps:list', 'vtex deps:ls']

  static flags = {
    keys: oclifFlags.boolean({ char: 'k', description: 'Show only keys', default: false }),
  }

  static args = []

  async run() {
    const { flags: keys } = this.parse(DepsList)

    await workspaceDepsList(keys)
  }
}
