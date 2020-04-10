import { dissocPath } from 'ramda'

import { apps } from '../../clients'

export async function appsSettingsUnset(app: string, field: string) {
  const fields = [field]
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(dissocPath(fields))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
