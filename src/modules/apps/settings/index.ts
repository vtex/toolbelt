import { path } from 'ramda'

import { apps } from '../../../clients'

const FIELDS_START_INDEX = 2

export default async (app: string, _, options) => {
  const fields = options._.slice(FIELDS_START_INDEX)
  const settingsValues = await apps
    .getAppSettings(app)
    .then(settings => (fields === null ? settings : path(fields, settings)))
    .then(value => JSON.stringify(value, null, 2))
  console.log(settingsValues)
}
