import { CustomCommand } from '../api/oclif/CustomCommand'
import authUrl from '../api/modules/url'

export default class URL extends CustomCommand {
  static description = 'Prints base URL for current account, workspace and environment'

  static examples = ['vtex url']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  async run() {
    this.parse(URL)

    console.log(authUrl())
  }
}
