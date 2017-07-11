import {dissocPath} from 'ramda'

import {apps} from '../../../clients'

const {getAppSettings, saveAppSettings} = apps

const FIELDS_START_INDEX = 3

export default {
  description: 'Unset a value',
  requiredArgs: ['app', 'fields'],
  handler: (app: string, _, options) => {
    const fields = options._.slice(FIELDS_START_INDEX)
    return getAppSettings(app)
      .then(dissocPath(fields))
      .then(newSettings => JSON.stringify(newSettings, null, 2))
      .tap(newSettings => saveAppSettings(app, newSettings))
      .tap(console.log)
  },
}
