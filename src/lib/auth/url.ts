import * as conf from '../../utils/conf'
import { clusterIdDomainInfix, publicEndpoint } from '../../utils/env'

export function authUrl() {
  const { account, workspace } = conf.currentContext
  console.log(`https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}`)
}
