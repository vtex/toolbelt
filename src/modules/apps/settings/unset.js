import jp from 'jsonpath'
import log from '../../../logger'
import {getWorkspace, getAccount} from '../../../conf'
import {appEngine} from '../../../clients'
import {workspaceMasterMessage} from '../utils'

export default {
  description: 'Unset a value',
  requiredArgs: ['app', 'field'],
  handler: async (app, field) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const patch = {}
    jp.value(patch, '$.' + field, null)
    const response = await appEngine().patchAppSettings(
      getAccount(), getWorkspace(), app, patch)
    console.log(response)
  },
}
