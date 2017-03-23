import * as jp from 'jsonpath'

import {apps} from '../../../clients'

const {saveAppSettings} = apps

export default {
  description: 'Set a value',
  requiredArgs: ['app', 'field', 'value'],
  handler: (app: string, field: string, value: string) => {
    const patch = {}
    jp.value(patch, '$.' + field, value)
    return saveAppSettings(app, patch)
      .then(res => JSON.stringify(res, null, 2))
      .tap(console.log)
  },
}
