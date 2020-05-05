import { SessionManager } from '../../lib/session/SessionManager'
import { copyToClipboard } from './utils'

export default () => {
  const { account } = SessionManager.getSingleton()
  copyToClipboard(account)
  return console.log(account)
}
