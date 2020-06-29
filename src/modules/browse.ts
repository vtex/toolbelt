import axios from 'axios'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import R from 'ramda'
import { clusterIdDomainInfix, publicEndpoint } from '../api/env'
import { Headers } from '../lib/constants/Headers'
import { SessionManager } from '../api/session/SessionManager'
// Doesn't seem to work with 'import', seems to return undefined for some reason ¯\_(ツ)_/¯
const QRCode = require('qrcode-terminal') // eslint-disable-line @typescript-eslint/no-var-requires

const isSupportRole = (role: string): boolean => role?.startsWith('vtex.support-authority')

const isSupportSession = (): boolean => {
  const { token } = SessionManager.getSingleton()
  const decoded = jwt.decode(token)
  if (!decoded || typeof decoded === 'string') {
    return false
  }

  return R.any(role => isSupportRole(role), decoded.roles as string[])
}

const prepareSupportBrowser = async (account: string, workspace: string): Promise<string> => {
  const { token } = SessionManager.getSingleton()

  const uri = `https://${workspace}--${account}.${publicEndpoint()}/_v/private/support-login/prepare`
  const response = await axios.get(uri, {
    headers: {
      [Headers.VTEX_ORIGINAL_CREDENTIAL]: token,
    },
  })
  return response.data.oneTimeToken
}

export default async (endpointInput, { q, qr }) => {
  const { account, workspace } = SessionManager.getSingleton()
  let endpoint = endpointInput ?? ''
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
