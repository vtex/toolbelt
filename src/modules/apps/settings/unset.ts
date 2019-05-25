import { dissocPath } from 'ramda'

import { apps } from '../../../clients'

const getAppSettings = Promise.method(apps.getAppSettings)
const saveAppSettings = Promise.method(apps.saveAppSettings)

const FIELDS_START_INDEX = 3

export default (app: string, _, options) => {
  const fields = options._.slice(FIELDS_START_INDEX)
  return getAppSettings(app)
    .then(dissocPath(fields))
    .then(newSettings => JSON.stringify(newSettings, null, 2))
    .tap(newSettings => saveAppSettings(app, newSettings))
    .tap(console.log)
}
