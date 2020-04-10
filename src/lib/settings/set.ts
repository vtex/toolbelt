import { merge } from 'ramda'

import { apps } from '../../clients'

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

export async function appsSettingsSet(app: string, field: string, value: string) {
  const commandSettings = { [field]: castValue(value) }
  const oldSettings = await apps.getAppSettings(app)
  const newSettingsJson = JSON.stringify(merge(oldSettings, commandSettings), null, 2)

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
