import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { redirectsImport } from '../../lib/redirects/import'

export default class RedirectsImport extends CustomCommand {
  static description = 'Import redirects for the current account and workspace'

  static examples = ['vtex redirects:import csvPath']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    reset: oclifFlags.boolean({ char: 'r', description: 'Remove all previous redirects', default: false }),
  }

  static args = [{ name: 'csvPath', required: true }]

  async run() {
    const {
      args: { csvPath },
      flags: { reset },
    } = this.parse(RedirectsImport)

    await redirectsImport(csvPath, reset)
  }
}
