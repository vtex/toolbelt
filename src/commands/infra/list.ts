import { flags as oclifFlags } from '@oclif/command'

import { appsInfraList } from '../../lib/infra/list'
import { CustomCommand } from '../../utils/CustomCommand'

export default class InfraList extends CustomCommand {
  static description = 'List installed infra services'

  static aliases = ['apps:infra:ls', 'infra:list', 'infra:ls']

  static examples = ['vtex apps:infra:list', 'vtex infra:list', 'vtex infra:ls', 'vtex infra:ls infraService']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    filter: oclifFlags.string({ char: 'f', description: 'Only list versions containing this word' }),
    available: oclifFlags.boolean({ char: 'a', description: 'List services available to install' }),
  }

  static args = [{ name: 'name', required: false }]

  async run() {
    const {
      args: { name },
      flags: { filter, available },
    } = this.parse(InfraList)
    return appsInfraList(name, filter, available)
  }
}
