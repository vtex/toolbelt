import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { authToken } from '../../lib/auth/Token'

export default class LocalToken extends CustomCommand {
  static description = "Show user's auth token and copy it to clipboard"

  static aliases = ['token']

  static examples = ['vtex auth:token', 'vtex token']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  async run() {
    authToken()
  }
}
