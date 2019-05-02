import * as opn from 'opn'
import * as conf from '../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../env'

export default (endpoint='') => {
  const { account, workspace } = conf.currentContext
  const uri = `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}/${endpoint}`

  opn(uri, { wait: false })
}
