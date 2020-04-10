import { flags as oclifFlags } from '@oclif/command'

import { CustomCommand } from '../../utils/CustomCommand'
import { appsSettingsSet } from '../../lib/settings/set'

export default class SettingsSet extends CustomCommand {
  static description = 'Set app settings'

  static examples = [
    'vtex settings set vtex.service-example fieldName fieldValue',
  ]

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [
    { name: 'appName', required: true },
    { name: 'field', required: true },
    { name: 'value', required: true },
  ]

  async run() {
    const {
      args: { appName, field, value },
    } = this.parse(SettingsSet)

    await appsSettingsSet(appName, field, value)
  }
}
