import { flags } from '@oclif/command'
import { dissocPath } from 'ramda'

import { CustomCommand } from '../../../lib/CustomCommand'
import { apps } from '../../../clients'

export default class SettingsUnset extends CustomCommand {
  static description = 'Unset app settings'

  static aliases = ['settings:unset']

  static examples = ['vtex apps:settings:unset vtex.service-example fieldName', 'vtex settings:unset vtex.service-example fieldName']

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'appName', required: true }, { name: 'field', required: true }]

  async run() {
    const {
      args: { appName: app, field },
    } = this.parse(SettingsUnset)

    const fields = [field]
    const newSettingsJson = await apps
      .getAppSettings(app)
      .then(dissocPath(fields))
      .then(newSettings => JSON.stringify(newSettings, null, 2))

    await apps.saveAppSettings(app, newSettingsJson)
    console.log(newSettingsJson)
  }
}
