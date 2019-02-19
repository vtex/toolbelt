import axios from 'axios'
import * as jwt from 'jsonwebtoken'
import * as opn from 'opn'
import * as R from 'ramda'
import * as conf from '../../conf'
import { publicEndpoint } from '../../env'
import log from '../../logger'

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
  const response = await axios.get(uri,
    {
      headers: {
        'X-Vtex-Original-Credential': token,
      },
    })
  return response.data.oneTimeToken
}

export default async () => {
  const supportSession = isSupportSession()
  const { account, workspace } = conf.currentContext

  try {
    const token = supportSession ? await prepareSupportBrowser(account, workspace) : null
    const url = `https://${workspace}--${account}.${publicEndpoint()}`
    const urn = supportSession ? `/_v/private/support-login/login?token=${token}` : '/admin'
    const uri = url + urn

    opn(uri, { wait: false })
  }
  catch (err) {
    if (err.message) {
      log.error(err.message)
      if (err.response && err.response.status === 404) {
        log.info('Make sure vtex.support-browse-admin is installed in your workspace.')
      }
      console.log({ response: err.response })
      return
    }
    log.error(err)
  }
}
