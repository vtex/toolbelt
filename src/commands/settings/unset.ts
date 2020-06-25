import { CustomCommand } from '../../api/oclif/CustomCommand'
import appsSettingsUnset from '../../modules/apps/settings/unset'

export default class SettingsUnset extends CustomCommand {
  static description = 'Unset app settings'

  static examples = ['vtex settings unset vtex.service-example fieldName']

  static flags = {
    ...CustomCommand.globalFlags,
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
