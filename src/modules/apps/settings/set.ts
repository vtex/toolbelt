import { __, merge } from 'ramda'
import { apps } from '../../../clients'

export default async (app: string, field, value) => {
  const newSetting = {}
  newSetting[field] = value
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(merge(__, newSetting))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
