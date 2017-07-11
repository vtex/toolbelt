import {path} from 'ramda'

import {apps} from '../../../clients'
import {dirnameJoin} from '../../../file'

const {getAppSettings} = apps

const FIELDS_START_INDEX = 2

export default {
  description: 'Get app settings',
  requiredArgs: 'app',
  optionalArgs: 'fields',
  handler: (app: string, _, options) => {
    const fields = options._.slice(FIELDS_START_INDEX)
    return getAppSettings(app)
      .then(settings => fields === null ? settings : path(fields, settings))
      .then(value => JSON.stringify(value, null, 2))
      .tap(console.log)
  },
  set: {
    module: dirnameJoin('modules/apps/settings/set'),
  },
  unset: {
    module: dirnameJoin('modules/apps/settings/unset'),
  },
}
