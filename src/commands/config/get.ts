import { CustomCommand } from '../../api/oclif/CustomCommand'
import configGet from '../../modules/config/get'

export default class ConfigGet extends CustomCommand {
  static description = 'Gets the current value for the requested configuration'

  static aliases = []

  static examples = ['vtex config get env', 'vtex config get cluster']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'configName', required: true, options: ['env', 'cluster'] }]

  async run() {
    const {
      args: { configName },
    } = this.parse(ConfigGet)

    configGet(configName)
  }
}
