import { flags } from '@oclif/command'
import { path } from 'ramda'

import { CustomCommand } from '../../../lib/CustomCommand'
import { apps } from '../../../clients'

export default class SettingsGet extends CustomCommand {
  static description = 'Get app settings'

  static examples = []

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'appName', required: true }, { name: 'options' }]

  private FIELDS_START_INDEX = 2

  async run() {
    const {
      args: { appName: app, options },
    } = this.parse(SettingsGet)

    const fields = options._.slice(this.FIELDS_START_INDEX)
    const settingsValues = await apps
      .getAppSettings(app)
      .then(settings => (fields === null ? settings : path(fields, settings)))
      .then(value => JSON.stringify(value, null, 2))
    console.log(settingsValues)
  }
}
