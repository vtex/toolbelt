import { CustomCommand } from '../../api/oclif/CustomCommand'
import workspaceDepsUpdate from '../../modules/deps/update'

export default class DepsUpdate extends CustomCommand {
  static description = 'Update all workspace dependencies or a specific app@version'

  static examples = ['vtex deps update', 'vtex deps update vtex.service-example@0.0.1']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static strict = false

  static args = [
    { name: 'appId', required: false },
    { name: 'ithAppId', required: false, multiple: true },
  ]

  async run() {
    const { raw } = this.parse(DepsUpdate)

    const allArgs = this.getAllArgs(raw)

    await workspaceDepsUpdate(allArgs)
  }
}
