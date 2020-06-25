import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInit from '../modules/init'

export default class Init extends CustomCommand {
  static description = 'Create basic files and folders for your VTEX app'

  static examples = ['vtex init']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = []

  async run() {
    this.parse(Init)

    await appsInit()
  }
}
