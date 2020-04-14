import { dissocPath } from 'ramda'

import { apps } from '../../../clients'

export default async (app: string, field: string) => {
  const newSettingsJson = await apps
    .getAppSettings(app)
    .then(dissocPath([field]))
    .then(newSettings => JSON.stringify(newSettings, null, 2))

  await apps.saveAppSettings(app, newSettingsJson)
  console.log(newSettingsJson)
}
