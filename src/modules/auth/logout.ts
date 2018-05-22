import { clear } from '../../conf'
import log from '../../logger'

export default () => {
  log.debug('Clearing config file')
  clear()
  log.info('See you soon!')
  return Promise.resolve()
}
