import { flags as oclifFlags } from '@oclif/command'
import { merge } from 'ramda'

import { CustomCommand } from '../../../lib/CustomCommand'
import { apps } from '../../../clients'

const castValue = value => {
  let parsedValue
  try {
    parsedValue = JSON.parse(value)
  } catch (err) {
    parsedValue = value
  }
  const numberCast = Number(value)
  return Number.isNaN(numberCast) ? parsedValue : numberCast
}

export default class SettingsSet extends CustomCommand {
  static description = 'Set app settings'

  static aliases = ['settings:set']

  static examples = [
    'vtex-test apps:settings:set vtex.service-example fieldName fieldValue',
    'vtex-test settings:set vtex.service-example fieldName fieldValue',
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
      args: { appName: app, field, value },
    } = this.parse(SettingsSet)

    const commandSettings = { [field]: castValue(value) }

    const oldSettings = await apps.getAppSettings(app)
    const newSettingsJson = JSON.stringify(merge(oldSettings, commandSettings), null, 2)

    await apps.saveAppSettings(app, newSettingsJson)
    console.log(newSettingsJson)
  }
}
