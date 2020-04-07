import { flags } from '@oclif/command'

import { getToken } from '../../conf'
import { CustomCommand } from '../../lib/CustomCommand'
import { copyToClipboard } from '../../lib/copyToClipboard'

export default class LocalToken extends CustomCommand {
  static description = "Show user's auth token and copy it to clipboard"

  static aliases = ['token']

  static examples = ['vtex auth:token', 'vtex token']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    const token = getToken()
    copyToClipboard(token)
    return console.log(token)
  }
}
