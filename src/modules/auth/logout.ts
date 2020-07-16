import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'

export default async () => {
  log.debug('Clearing config file')
  const sessionManager = SessionManager.getSingleton()
  await sessionManager.logout({ invalidateBrowserAuthCookie: true })
  log.info('See you soon!')
}
