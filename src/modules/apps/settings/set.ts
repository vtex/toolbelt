import { merge, __ } from 'ramda'
import { createAppsClient } from '../../../api/clients/IOClients/infra/Apps'

export default async (app: string, field, value) => {
  const apps = createAppsClient()

  const newSetting = {}
  newSetting[field] = value
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(merge(__, newSetting))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
