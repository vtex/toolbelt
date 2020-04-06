import { flags } from '@oclif/command'

import { apps } from '../../../clients'
import { CustomCommand } from '../../../lib/CustomCommand'
import log from '../../../logger'

const { getDependencies } = apps

export default class DepsList extends CustomCommand {
  static aliases = []

  static description = 'List your workspace dependencies'

  static examples = []

  static flags = {
    keys: flags.boolean({ char: 'k', description: 'Show only keys', default: false }),
  }

  static args = []

  async run() {
    const { flags } = this.parse(DepsList)
    log.debug('Starting to list dependencies')
    const deps = await getDependencies()
    const keysOnly = flags.keys
    const result = keysOnly ? Object.keys(deps) : deps
    console.log(JSON.stringify(result, null, 2))
  }
}
