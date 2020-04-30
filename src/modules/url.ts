import { clusterIdDomainInfix, publicEndpoint } from '../env'
import { SessionManager } from '../lib/session/SessionManager'

export default () => {
  const { account, workspace } = SessionManager.getSingleton()
  console.log(`https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`)
}
