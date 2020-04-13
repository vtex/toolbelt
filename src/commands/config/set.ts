import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import configSet from '../../modules/config/set'

export default class ConfigSet extends CustomCommand {
  static description = 'Sets the current value for the given configuration'

  static aliases = []

  static examples = ['vtex config set env envValue', 'vtex config set cluster clusterValue']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'configName', required: true, options: ['env', 'cluster'] },
    { name: 'value', required: true },
  ]

  async run() {
    const {
      args: { configName, value },
    } = this.parse(ConfigSet)

    configSet(configName, value)
  }
}
