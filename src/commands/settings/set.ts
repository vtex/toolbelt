import { CustomCommand } from '../../api/oclif/CustomCommand'
import appsSettingsSet from '../../modules/apps/settings/set'

export default class SettingsSet extends CustomCommand {
  static description = 'Set app settings'

  static examples = ['vtex settings set vtex.service-example fieldName fieldValue']

  static flags = {
    ...CustomCommand.globalFlags,
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
