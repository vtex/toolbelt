import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../utils/CustomCommand'
import { authUrl } from '../lib/url'

export default class URL extends CustomCommand {
  static description = 'Prints base URL for current account, workspace and environment'

  static aliases = ['url']

  static examples = ['vtex auth:url', 'vtex url']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {
    this.parse(URL)

    authUrl()
  }
}
