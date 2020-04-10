import * as conf from '../../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../../env'

export function authUrl() {
  const { account, workspace } = conf.currentContext
  console.log(`https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`)
}
