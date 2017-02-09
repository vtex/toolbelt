import jp from 'jsonpath'
import {apps} from '../../../clients'

export default {
  description: 'Unset a value',
  requiredArgs: ['app', 'field'],
  handler: async (app, field) => {
    const patch = {}
    jp.value(patch, '$.' + field, null)
    const response = await apps.patchAppSettings(app, patch)
    console.log(response)
  },
}
