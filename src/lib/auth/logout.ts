import log from '../../logger'
import { SessionManager } from '../../utils/session/SessionManager'

export function authLogout() {
  log.debug('Clearing config file')
  const sessionManager = SessionManager.getSessionManager()
  sessionManager.logout()
  log.info('See you soon!')
}
