import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { configGet } from '../../lib/config/get'

export default class ConfigGet extends CustomCommand {
  static description = 'Gets the current value for the requested configuration'

  static aliases = []

  static examples = ['vtex apps:config:get env', 'vtex config:get env', 'vtex config:get cluster']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'configName', required: true, options: ['env', 'cluster'] }]

  async run() {
    const {
      args: { configName },
    } = this.parse(ConfigGet)

    configGet(configName)
  }
}
