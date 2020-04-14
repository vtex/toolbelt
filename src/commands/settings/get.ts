import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import appsSettingsGet from '../../modules/apps/settings'

export default class SettingsGet extends CustomCommand {
  static description = 'Get app settings'

  static aliases = ['settings']

  static examples = ['vtex settings get vtex.service-example']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'appName', required: true }, { name: 'field' }]

  async run() {
    const {
      args: { appName, field },
    } = this.parse(SettingsGet)

    await appsSettingsGet(appName, field, {_: [field]})
  }
}
