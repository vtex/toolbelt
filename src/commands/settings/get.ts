import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsSettingsGet } from '../../lib/settings/get'

export default class SettingsGet extends CustomCommand {
  static description = 'Get app settings'

  static aliases = ['settings']

  static examples = ['vtex settings get vtex.service-example']

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
