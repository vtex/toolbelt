import axios from 'axios'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import { join } from 'path'
import randomstring from 'randomstring'
import { clusterIdDomainInfix, publicEndpoint } from '../../../api/env'
import { onAuth } from '../../sse'
import { spawnUnblockingChildProcess } from '../../utils/spawnUnblockingChildProcess'
import { AuthProviderBase } from './AuthProviderBase'

export class OAuthAuthenticator extends AuthProviderBase {
  public static readonly AUTH_TYPE = 'oauth'

  public async login(account: string, workspace: string) {
    const [token, returnUrl] = await this.startUserAuth(account, workspace)
    const decodedToken = jwt.decode(token)
    const login: string = decodedToken.sub
    this.closeChromeTabIfMac(returnUrl)
    return { login, token, returnUrl }
  }

  private closeChromeTabIfMac(returnUrl: string) {
    if (process.platform === 'darwin') {
      spawnUnblockingChildProcess('osascript', [join(__dirname, '../../../../scripts/closeChrome.scpt'), returnUrl])
    }
  }

  private async startUserAuth(account: string, workspace: string): Promise<string[] | never> {
    const state = randomstring.generate()
    const [url, fullReturnUrl] = await this.getLoginUrl(account, workspace, state)
    opn(url, { wait: false })
    return onAuth(account, workspace, state, fullReturnUrl)
  }

  private getOldLoginUrls(workspace: string, state: string) {
    const returnUrl = `/_v/private/auth-server/v1/callback?workspace=${workspace}&state=${state}`
    const url = `/_v/private/auth-server/v1/login/?workspace=${workspace}`
    return [url, returnUrl]
  }

  private getNewLoginUrls(workspace: string, state: string) {
    const returnUrl = `/_v/private/auth-server/v1/callback?workspace=${workspace}&state=${state}`
    const url = `/_v/segment/admin-login/v1/login?workspace=${workspace}`
    return [url, returnUrl]
  }

  private async getLoginUrl(account: string, workspace: string, state: string): Promise<[string, string]> {
    const baseUrl = `https://${account}${clusterIdDomainInfix()}.${publicEndpoint()}`
    let [url, returnUrl] = this.getNewLoginUrls(workspace, state)
    try {
      const response = await axios.get(`${baseUrl}${url}`)
      if (!response.data.match(/vtex\.admin-login/)) {
        throw new Error('Unexpected response from admin-login')
      }
    } catch (e) {
      const oldUrls = this.getOldLoginUrls(workspace, state)
      url = oldUrls[0]
      returnUrl = oldUrls[1]
    }
    const fullReturnUrl = baseUrl + returnUrl
    const returnUrlEncoded = encodeURIComponent(returnUrl)
    return [`${baseUrl}${url}&returnUrl=${returnUrlEncoded}`, fullReturnUrl]
  }
}
