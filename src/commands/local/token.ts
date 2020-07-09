import { CustomCommand } from '../../api/oclif/CustomCommand'
import authToken from '../../modules/local/token'

export default class LocalToken extends CustomCommand {
  static description = "Show user's auth token and copy it to clipboard"

  static examples = ['vtex local token']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  async run() {
    authToken()
  }
}
