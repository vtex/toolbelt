import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import auditUrl from '../../modules/lighthouse/auditUrl'

export default class AuditUrl extends CustomCommand {
  static description = 'Run lighthouse audit over a specific url'

  static examples = ['vtex lighthouse audit my.url.com', 'vtex lh audit my.url.com']

  static aliases = ['lh:audit']

  static flags = {
    ...CustomCommand.globalFlags,
    json: oclifFlags.boolean({ char: 'j', description: 'Return the report as json on stdout', default: false }),
  }

  static args = [{ name: 'url', required: true }]

  async run() {
    const {
      args: { url },
      flags: { json },
    } = this.parse(AuditUrl)

    await auditUrl(url, { json })
  }
}
