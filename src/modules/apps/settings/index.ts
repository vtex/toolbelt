import { path } from 'ramda'

import { apps } from '../../../clients'

export default async (app: string, fields: string[]) => {
  const settingsValues = await apps
    .getAppSettings(app)
    .then(settings => (fields === null ? settings : path(fields, settings)))
    .then(value => JSON.stringify(value, null, 2))
  console.log(settingsValues)
}
