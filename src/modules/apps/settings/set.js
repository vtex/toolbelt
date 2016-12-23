import jp from 'jsonpath'
import log from '../../../logger'
import {getWorkspace, getAccount} from '../../../conf'
import {apps} from '../../../clients'
import {workspaceMasterMessage} from '../utils'

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
    const response = await apps().patchAppSettings(
      getAccount(), getWorkspace(), app, patch)
    console.log(response)
  },
}
