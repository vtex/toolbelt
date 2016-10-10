import jp from 'jsonpath'
import log from '../../../logger'
import {getWorkspace, getAccount} from '../../../conf'
import {workspaceMasterMessage, appsClient} from '../utils'

export default {
  description: 'Set a value',
  requiredArgs: ['app', 'field', 'value'],
  handler: async (app, field, value) => {
    const workspace = getWorkspace()
    if (workspace === 'master') {
      log.error(workspaceMasterMessage)
      return Promise.resolve()
    }

    const patch = {}
    jp.value(patch, '$.' + field, value)
    const response = await appsClient().patchAppSettings(
      getAccount(), getWorkspace(), app, patch)
    console.log(response)
  },
}
