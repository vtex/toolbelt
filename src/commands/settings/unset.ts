import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsSettingsUnset } from '../../lib/settings/unset'

export default class SettingsUnset extends CustomCommand {
  static description = 'Unset app settings'

  static aliases = ['settings:unset']

  static examples = [
    'vtex apps:settings:unset vtex.service-example fieldName',
    'vtex settings:unset vtex.service-example fieldName',
  ]

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'appName', required: true },
    { name: 'field', required: true },
  ]

  async run() {
    const {
      args: { appName, field },
    } = this.parse(SettingsUnset)

    await appsSettingsUnset(appName, field)
  }
}
