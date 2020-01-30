import axios from 'axios'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import R from 'ramda'
import * as conf from '../conf'
import { clusterIdDomainInfix, publicEndpoint } from '../env'
// Doesn't seem to work with 'import', seems to return undefined for some reason ¯\_(ツ)_/¯
const QRCode = require('qrcode-terminal') // eslint-disable-line @typescript-eslint/no-var-requires

const isSupportRole = (role: string): boolean => role && role.startsWith('vtex.support-authority')

const isSupportSession = (): boolean => {
  const token = conf.getToken()
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string') {
    return false
  }

  return R.any(role => isSupportRole(role), decoded.roles as string[])
}

const prepareSupportBrowser = async (account: string, workspace: string): Promise<string> => {
  const token = conf.getToken()

  const uri = `https://${workspace}--${account}.${publicEndpoint()}/_v/private/support-login/prepare`
  const response = await axios.get(uri, {
    headers: {
      'X-Vtex-Original-Credential': token,
    },
  })
  return response.data.oneTimeToken
}

export default async (endpoint = '', { q, qr }) => {
  const { account, workspace } = conf.currentContext
  if (isSupportSession()) {
    const token = await prepareSupportBrowser(account, workspace)
    endpoint = `_v/private/support-login/login?token=${token}&returnUrl=/${endpoint}`
  }
  const uri = `https://${workspace}--${account}${clusterIdDomainInfix()}.${publicEndpoint()}/${endpoint}`

  if (q || qr) {
    QRCode.generate(uri, { small: true })
    return
  }

  opn(uri, { wait: false })
}
