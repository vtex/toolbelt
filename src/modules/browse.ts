import * as opn from 'opn'
import * as conf from '../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../env'
// Doesn't seem to work with 'import', seems to return undefined for some reason ¯\_(ツ)_/¯
const QRCode = require('qrcode-terminal') // tslint:disable-line no-var-requires

export default (endpoint='', {q, qr}) => {
  const { account, workspace } = conf.currentContext
  const uri = `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}/${endpoint}`

  if (q || qr) {
    QRCode.generate(uri, { small: true })
    return
  }

  opn(uri, { wait: false })
}
