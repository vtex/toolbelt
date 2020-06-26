import { path } from 'ramda'
import { createAppsClient } from '../../../api/clients/IOClients/infra/Apps'

export default async (app: string, fields: string[]) => {
  const apps = createAppsClient()

  const settingsValues = await apps
    .getAppSettings(app)
    .then(settings => (fields === null ? settings : path(fields, settings)))
    .then(value => JSON.stringify(value, null, 2))
  console.log(settingsValues)
}
