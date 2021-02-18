import { merge, __ } from 'ramda'
import { createAppsClient } from '../../../api/clients/IOClients/infra/Apps'

const castValue = (value: string) => {
  let parsedValue: any
  try {
    parsedValue = JSON.parse(value)
  } catch (err) {
    parsedValue = value
  }

  const numberCast = Number(value)
  return Number.isNaN(numberCast) ? parsedValue : numberCast
}

export default async (app: string, field, value) => {
  const apps = createAppsClient()

  const newSetting = {}
  newSetting[field] = castValue(value)
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(merge(__, newSetting))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
