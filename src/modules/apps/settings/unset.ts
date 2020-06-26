import { dissocPath } from 'ramda'
import { createAppsClient } from '../../../api/clients/IOClients/infra/Apps'

export default async (app: string, field: string) => {
  const apps = createAppsClient()
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(dissocPath([field]))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
