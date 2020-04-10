import { flags as oclifFlags } from '@oclif/command'

import { appsSettingsGet } from '../../../lib/apps/settings/get'
import { CustomCommand } from '../../../utils/CustomCommand'

export default class SettingsGet extends CustomCommand {
  static description = 'Get app settings'

  static aliases = ['settings', 'settings:get']

  static examples = ['vtex apps:settings:get vtex.service-example', 'vtex settings:get vtex.service-example']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'appName', required: true }, { name: 'options' }]

  async run() {
    const {
      args: { appName, options },
    } = this.parse(SettingsGet)

    await appsSettingsGet(appName, options)
  }
}
