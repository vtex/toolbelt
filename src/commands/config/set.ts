import { flags } from '@oclif/command'
import chalk from 'chalk'
import { contains, values } from 'ramda'

import { CommandError } from '../../errors'
import log from '../../logger'
import { CustomCommand } from '../../lib/CustomCommand'
import { Environment, saveCluster, saveEnvironment } from '../../conf'

const envValues = values(Environment)

export default class ConfigSet extends CustomCommand {
  static description = 'Sets the current value for the given configuration'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'configName', required: true },
    { name: 'value', required: true },
  ]

  async run() {
    const {
      args: { configName: name, value },
    } = this.parse(ConfigSet)

    switch (name) {
      case 'env':
        if (!contains(value, envValues)) {
          throw new CommandError(`Invalid value for environment "${value}". Possible values are: ${envValues.join(', ')}`)
        }
        saveEnvironment(value as Environment)
        log.info(`Successfully set environment to "${value}"`)
        break
      case 'cluster':
        saveCluster(value)
        log.info(`Successfully set cluster to "${value}"`)
        break
      default:
        throw new CommandError(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`)
    }
  }
}
