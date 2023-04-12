import { publicEndpoint } from '../env'
import { SessionManager } from '../session/SessionManager'

export default () => {
  const { account, workspace } = SessionManager.getSingleton()
  return `https://${workspace}--${account}.${publicEndpoint()}`
}
