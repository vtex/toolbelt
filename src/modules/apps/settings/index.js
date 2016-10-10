import jp from 'jsonpath'
import {appsClient} from '../utils'
import {dirnameJoin} from '../../../file'
import {getWorkspace, getAccount} from '../../../conf'

export default {
  description: 'Get app settings',
  requiredArgs: 'app',
  optionalArgs: 'field',
  handler: async (app, field) => {
    const response = await appsClient().getAppSettings(
      getAccount(), getWorkspace(), app)
    if (typeof field === 'object') {
      console.log(response)
    } else {
      console.log(jp.value(response, '$.' + field))
    }
  },
  set: {
    module: dirnameJoin('modules/apps/settings/set'),
  },
  unset: {
    module: dirnameJoin('modules/apps/settings/unset'),
  },
}
