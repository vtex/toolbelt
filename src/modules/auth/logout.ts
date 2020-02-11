import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'

export default () => {
  log.debug('Clearing config file')
  const sessionManager = SessionManager.getSessionManager()
  sessionManager.logout()
  log.info('See you soon!')
}
