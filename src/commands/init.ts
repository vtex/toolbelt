import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInit from '../modules/init'

export default class Init extends CustomCommand {
  static description = 'Create basic files and folders for your VTEX app'

  static examples = ['vtex init', 'vtex init project-name']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'projectName', required: false }]

  async run() {
    const {
      args: { projectName },
    } = this.parse(Init)

    await appsInit(projectName)
  }
}
