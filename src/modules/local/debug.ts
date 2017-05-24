import {resolve} from 'path'
import {getAccount, getWorkspace, getToken} from '../../conf'

import log from '../../logger'

export default {
  description: 'Run a Colossus function locally',
  handler: async () => {
    const debug = resolve(process.cwd(), 'service/debug.js')
    try {
      process.env.VTEX_IO = 'false'
      const debugFn = require(debug)
      log.info('Running debug script:', debug)
      debugFn({
        account: getAccount(),
        workspace: getWorkspace(),
        authToken: getToken(),
      })
    } catch (e) {
      if (e.message.startsWith('Cannot find module')) {
        return log.error('No debug script found. Create one in ./service/debug.js exporting a function that receives ctx.')
      }
      throw e
    }
  },
}
