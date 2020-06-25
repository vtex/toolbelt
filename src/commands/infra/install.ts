import appsInfraInstall from '../../modules/infra/install'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class InfraInstall extends CustomCommand {
  static description = 'Install an infra service'

  static examples = ['vtex infra install infra-service', 'vtex infra install infra-service@0.0.1']

  static flags = { ...CustomCommand.globalFlags }

  static args = [{ name: 'serviceId', required: true }]

  async run() {
    const { args } = this.parse(InfraInstall)
    const name = args.serviceId

    await appsInfraInstall(name)
  }
}
