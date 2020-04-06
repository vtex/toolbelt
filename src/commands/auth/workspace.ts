import { flags } from '@oclif/command'

import { getWorkspace } from '../../conf'
import { CustomCommand } from '../../lib/CustomCommand'
import { copyToClipboard } from '../../lib/copyToClipboard'

export default class LocalWorkspace extends CustomCommand {
  static description = 'Show current workspace and copy it to clipboard'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = []

  async run() {
    this.parse(LocalWorkspace)
    const workspace = getWorkspace()
    copyToClipboard(workspace)
    return console.log(workspace)
  }
}
