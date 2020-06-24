import { SessionManager } from '../../api/session/SessionManager'
import { copyToClipboard } from './utils'

export default () => {
  const { token } = SessionManager.getSingleton()
  copyToClipboard(token)
  return console.log(token)
}
