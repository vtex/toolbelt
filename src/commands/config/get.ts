import { flags } from '@oclif/command'
import chalk from 'chalk'

import { CommandError } from '../../errors'
import { CustomCommand } from '../../lib/CustomCommand'
import { getCluster, getEnvironment } from '../../conf'

export default class ConfigGet extends CustomCommand {
  static description = 'Gets the current value for the requested configuration'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'configName', required: true }]

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
      default:
        throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
    }
  }
}
