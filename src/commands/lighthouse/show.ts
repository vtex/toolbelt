import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import { showReports } from '../../modules/lighthouse/showReports'
// import auditUrl from '../../modules/lighthouse/auditUrl'

export default class ShowReports extends CustomCommand {
  static description = 'Show previous saved audit reports, filtering by app and/or url'

  static examples = [
    'vtex lighthouse show -app=vtex.awesome-app',
    'vtex lighthouse show -u https://awesome.store.com',
    'vtex lighthouse show -a=vtex.awesome-app --url=https://awesome.store.com',
    'vtex lh show -app=vtex.awesome-app',
    'vtex lh show -u https://awesome.store.com',
    'vtex lh show -a=vtex.awesome-app --url=https://awesome.store.com',
  ]

  static aliases = ['lh:show']

  static flags = {
    ...CustomCommand.globalFlags,
    app: oclifFlags.string({ char: 'a', description: 'App name to be filtered' }),
    url: oclifFlags.string({ char: 'u', description: 'Url to be filtered' }),
  }

  async run() {
    const {
      flags: { app, url },
    } = this.parse(ShowReports)

    await showReports(app, url)
  }
}
