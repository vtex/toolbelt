import { flags as oclifFlags } from '@oclif/command'

import appsInfraList from '../../modules/infra/list'
import { CustomCommand } from '../../api/oclif/CustomCommand'

export default class InfraList extends CustomCommand {
  static description = 'List installed infra services'

  static aliases = ['infra:ls']

  static examples = ['vtex infra list', 'vtex infra ls']

  static flags = {
    ...CustomCommand.globalFlags,
    filter: oclifFlags.string({ char: 'f', description: 'Only list versions containing this word' }),
    available: oclifFlags.boolean({ char: 'a', description: 'List services available to install' }),
  }

  static args = [{ name: 'name', required: false }]

  async run() {
    const {
      args: { name },
      flags: { filter, available },
    } = this.parse(InfraList)
    return appsInfraList(name, { filter, available })
  }
}
