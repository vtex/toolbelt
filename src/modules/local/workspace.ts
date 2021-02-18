import { SessionManager } from '../../api/session/SessionManager'
import { copyToClipboard } from './utils'

export default () => {
  const { workspace } = SessionManager.getSingleton()
  copyToClipboard(workspace)
  return console.log(workspace)
}
