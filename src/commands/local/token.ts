import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import authToken from '../../modules/local/token'

export default class LocalToken extends CustomCommand {
  static description = "Show user's auth token and copy it to clipboard"

  static examples = ['vtex local token']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {
    authToken()
  }
}
