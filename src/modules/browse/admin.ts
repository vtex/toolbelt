import * as opn from 'opn'
import * as conf from '../../conf'
import { publicEndpoint } from '../../env'

export default () => {
  const { account, workspace } = conf.currentContext
  const uri = `https://${workspace}--${account}.${publicEndpoint()}/admin`

  opn(uri, { wait: false })
}
