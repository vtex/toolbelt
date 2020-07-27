import axios from 'axios'
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import { join } from 'path'
import { VTEXID } from '../../../../api/clients/IOClients/external/VTEXID'
import { storeUrl } from '../../../../api/storeUrl'
import { randomCryptoString } from '../../../utils/randomCryptoString'
import { spawnUnblockingChildProcess } from '../../../utils/spawnUnblockingChildProcess'
import { AuthProviderBase } from '../AuthProviderBase'
import { LoginServer } from './LoginServer'

export class OAuthAuthenticator extends AuthProviderBase {
  public static readonly AUTH_TYPE = 'oauth'
  private static readonly SECRET_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

  private static ADMIN_LOGIN_URL_PATH = '/_v/segment/admin-login/v1/login'
  private static FALLBACK_AUTH_SERVER_LOGIN_URL_PATH = '/_v/private/auth-server/v1/login'

  public async login(account: string) {
    const secret = randomCryptoString(128, OAuthAuthenticator.SECRET_ALPHABET)
    const secretHash = this.hashSecret(secret)
    const vtexId = VTEXID.createClient({ account })

    const loginServer = await LoginServer.create({
      account,
      secret,
    })

    try {
      const loginState = await vtexId.startToolbeltLogin({
        account,
        secretHash,
        loopbackUrl: loginServer.loginCallbackUrl,
      })

      loginServer.setLoginState(loginState)

      const url = await this.loginUrl(account, loginState)
      opn(url, { wait: false })

      const token = await loginServer.token
      const decodedToken = jwt.decode(token)
      const login: string = decodedToken.sub
      this.closeChromeTabIfMac(loginServer.loginCallbackUrl)
      return { login, token }
    } catch (err) {
      console.log(err)
      throw err
    } finally {
      loginServer.close()
    }
  }

  private hashSecret(secret: string) {
    return createHash('sha256')
      .update(secret)
      .digest('base64')
  }

  private async loginUrl(account: string, loginState: string) {
    const hasAdminLogin = await this.hasAdminLoginInstalled(account)
    const returnUrl = `/api/vtexid/toolbelt/callback?state=${encodeURIComponent(loginState)}`

    let loginPathPrefix: string
    if (!hasAdminLogin) {
      // If for some reason vtex.admin-login is not installed in the account, fallback to use auth-server login url
      loginPathPrefix = storeUrl({
        account,
        addWorkspace: false,
        path: OAuthAuthenticator.FALLBACK_AUTH_SERVER_LOGIN_URL_PATH,
      })
    } else {
      loginPathPrefix = storeUrl({ account, addWorkspace: false, path: OAuthAuthenticator.ADMIN_LOGIN_URL_PATH })
    }

    return `${loginPathPrefix}?returnUrl=${encodeURIComponent(returnUrl)}`
  }

  private async hasAdminLoginInstalled(account: string) {
    try {
      const { data } = await axios.get<string>(
        storeUrl({ account, addWorkspace: false, path: '/_v/segment/admin-login/v1/login' })
      )

      return data.includes('vtex.admin-login')
    } catch (err) {
      if (err.response?.status === 404) {
        return false
      }

      throw err
    }
  }

  private closeChromeTabIfMac(loginCallbackUrl: string) {
    if (process.platform === 'darwin') {
      spawnUnblockingChildProcess('osascript', [
        join(__dirname, '../../../../scripts/closeChrome.scpt'),
        loginCallbackUrl,
      ])
    }
  }
}
