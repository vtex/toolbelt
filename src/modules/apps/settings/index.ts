import * as jp from 'jsonpath'

import {apps} from '../../../clients'
import {dirnameJoin} from '../../../file'

const {getAppSettings} = apps

export default {
  description: 'Get app settings',
  requiredArgs: 'app',
  optionalArgs: 'field',
  handler: (app: string, field: string) => {
    return getAppSettings(app)
      .then(res => field === null ? res : jp.value(res, `$.${field}`))
      .then(msg => JSON.stringify(msg, null, 2))
      .tap(console.log)
  },
  set: {
    module: dirnameJoin('modules/apps/settings/set'),
  },
  unset: {
    module: dirnameJoin('modules/apps/settings/unset'),
  },
}
