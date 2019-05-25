import * as opn from 'opn'
import * as conf from '../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../env'
const QRCode = require('qrcode-terminal')

export default (endpoint='', {q, qr}) => {
  const { account, workspace } = conf.currentContext
  const uri = `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}/${endpoint}`

  if (q || qr) {
    QRCode.generate(uri, { small: true })
    return
  }

  opn(uri, { wait: false })
}
