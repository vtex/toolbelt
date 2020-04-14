import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../oclif/CustomCommand'
import appsSettingsUnset from '../../modules/apps/settings/unset'

export default class SettingsUnset extends CustomCommand {
  static description = 'Unset app settings'

  static examples = ['vtex settings unset vtex.service-example fieldName']

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
