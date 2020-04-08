import { flags } from '@oclif/command'

import { CustomCommand } from '../../lib/CustomCommand'
import { getCluster, getEnvironment } from '../../conf'

export default class ConfigGet extends CustomCommand {
  static description = 'Gets the current value for the requested configuration'

  static aliases = []

  static examples = ['vtex apps:config:get env', 'vtex config:get env', 'vtex config:get cluster']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'configName', required: true, options: ['env', 'cluster']}]

  async run() {
    const {
      args: { configName: name },
    } = this.parse(ConfigGet)

    switch (name) {
      case 'env':
        console.log(getEnvironment() || '')
        break
      case 'cluster':
        console.log(getCluster())
        break
    }
  }
}
