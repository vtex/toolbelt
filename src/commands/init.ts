import { CustomCommand } from '../api/oclif/CustomCommand'
import appsInit from '../modules/init'

export default class Init extends CustomCommand {
  static description = 'Copies starting files and folders from VTEX boilerplates into your local directories.'

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
