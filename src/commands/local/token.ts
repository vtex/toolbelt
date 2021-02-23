import { CustomCommand } from '../../api/oclif/CustomCommand'
import authToken from '../../modules/local/token'

export default class LocalToken extends CustomCommand {
  static description = "Prints the user's auth token and copies it to the clipboard."

  static examples = ['vtex local token']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  async run() {
    authToken()
  }
}
