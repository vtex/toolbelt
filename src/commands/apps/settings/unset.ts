import { flags } from '@oclif/command'
import { dissocPath } from 'ramda'

import { CustomCommand } from '../../../lib/CustomCommand'
import { apps } from '../../../clients'

export default class SettingsUnset extends CustomCommand {
  static description = 'Set app settings'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'appName', required: true }, { name: 'options' }]

  private FIELDS_START_INDEX = 1

  async run() {
    const {
      args: { appName: app, options },
    } = this.parse(SettingsUnset)

    const fields = options._.slice(this.FIELDS_START_INDEX)
    const newSettingsJson = await apps
      .getAppSettings(app)
      .then(dissocPath(fields))
      .then(newSettings => JSON.stringify(newSettings, null, 2))

    await apps.saveAppSettings(app, newSettingsJson)
    console.log(newSettingsJson)
  }
}
