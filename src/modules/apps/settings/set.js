import jp from 'jsonpath'
import {apps} from '../../../clients'

export default {
  description: 'Set a value',
  requiredArgs: ['app', 'field', 'value'],
  handler: async (app, field, value) => {
    const patch = {}
    jp.value(patch, '$.' + field, value)
    const response = await apps().patchAppSettings(app, patch)
    console.log(response)
  },
}
