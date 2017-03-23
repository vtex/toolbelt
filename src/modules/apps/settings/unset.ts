import * as jp from 'jsonpath'

import {apps} from '../../../clients'

const {getAppSettings, saveAppSettings} = apps

export default {
  description: 'Unset a value',
  requiredArgs: ['app', 'field'],
  handler: (app: string, field: string) => {
    return getAppSettings(app)
      .tap(patch => jp.value(patch, `$.${field}`, null))
      .then(patch => saveAppSettings(app, patch))
      .then(res => JSON.stringify(res, null, 2))
      .tap(console.log)
  },
}
