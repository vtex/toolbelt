import { path } from 'ramda'

import { apps } from '../../clients'

const FIELDS_START_INDEX = 2

export async function appsSettingsGet(app: string, options) {
  const fields = options?._.slice(FIELDS_START_INDEX)
  const settingsValues = await apps
    .getAppSettings(app)
    .then(settings => (fields ? path(fields, settings) : settings))
    .then(value => JSON.stringify(value, null, 2))
  console.log(settingsValues)
}
