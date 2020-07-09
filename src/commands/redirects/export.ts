import { CustomCommand } from '../../api/oclif/CustomCommand'
import redirectsExport from '../../modules/rewriter/export'

export default class RedirectsExport extends CustomCommand {
  static description = 'Export all redirects in the current account and workspace'

  static examples = ['vtex redirects export csvPath']

  static flags = {
    ...CustomCommand.globalFlags,
  }

  static args = [{ name: 'csvPath', required: true }]

  async run() {
    const {
      args: { csvPath },
    } = this.parse(RedirectsExport)

    await redirectsExport(csvPath)
  }
}
