import log from '../../logger'
import { clear } from '../../conf'

export default () => {
  log.debug('Clearing config file')
  clear()
  log.info('See you soon!')
  return Promise.resolve()
}
