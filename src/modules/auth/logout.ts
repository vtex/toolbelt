import log from '../../logger'
import {clear} from '../../conf'

export default {
  description: 'Logout of the current VTEX account',
  handler: () => {
    log.debug('Clearing config file')
    clear()
    log.info('See you soon!')
    return Promise.resolve()
  },
}
