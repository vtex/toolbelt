import { clusterIdDomainInfix, publicEndpoint } from '../api/env'
import { SessionManager } from '../api/session/SessionManager'

export default () => {
  const { account, workspace } = SessionManager.getSingleton()
  console.log(`https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`)
}
