import { flags as oclifFlags } from '@oclif/command'

import { appsInfraInstall } from '../../lib/infra/install'
import { CustomCommand } from '../../utils/CustomCommand'

export default class InfraInstall extends CustomCommand {
  static description = 'Install an infra service'

  static aliases = ['infra:install']

  static examples = [
    'vtex apps:infra:install infra-service',
    'vtex infra:install infra-service',
    'vtex infra:install infra-service@0.0.1',
  ]

  static flags = { help: oclifFlags.help({ char: 'h' }) }

  static args = [{ name: 'serviceId', required: true }]

  async run() {
    const { args } = this.parse(InfraInstall)
    const name = args.serviceId

    await appsInfraInstall(name)
  }
}
