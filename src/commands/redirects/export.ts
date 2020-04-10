import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { redirectsExport } from '../../lib/redirects/export'

export default class RedirectsExport extends CustomCommand {
  static description = 'Export all redirects in the current account and workspace'

  static examples = ['vtex redirects:export csvPath']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'csvPath', required: true }]

  async run() {
    const {
      args: { csvPath },
    } = this.parse(RedirectsExport)

    await redirectsExport(csvPath)
  }
}
