import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../oclif/CustomCommand'
import authUrl from '../modules/url'

export default class URL extends CustomCommand {
  static description = 'Prints base URL for current account, workspace and environment'

  static examples = ['vtex url']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {
    this.parse(URL)

    authUrl()
  }
}
