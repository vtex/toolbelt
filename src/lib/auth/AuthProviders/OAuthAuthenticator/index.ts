import axios from 'axios'
import { createHash } from 'crypto'
import isWsl from 'is-wsl'
import jwt from 'jsonwebtoken'
import { join } from 'path'
import logger from '../../../../api/logger'
import { VTEXID } from '../../../../api/clients/IOClients/external/VTEXID'
import { storeUrl } from '../../../../api/storeUrl'
import { ColorifyConstants } from '../../../../api/constants/Colors'
import { randomCryptoString } from '../../../utils/randomCryptoString'
import { spawnUnblockingChildProcess } from '../../../utils/spawnUnblockingChildProcess'
import { AuthProviderBase } from '../AuthProviderBase'
import { LoginServer } from './LoginServer'
import { switchOpen } from '../../../../modules/featureFlag/featureFlagDecider'

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
      switchOpen(url, { wait: false })

      if (isWsl) {
        logger.warn(
          "We noticed you're using WSL, in which case you may face login issues depending on your WSL version."
        )

        logger.warn(
          `If you do, make sure your Windows is up to date and try again (${ColorifyConstants.URL_INTERACTIVE(
            'https://support.microsoft.com/en-us/help/4027667/windows-10-update'
          )}).`
        )

        logger.warn(
          `In case login errors persist after updating please create an issue on ${ColorifyConstants.URL_INTERACTIVE(
            'https://github.com/vtex/toolbelt/issues'
          )}. We'll promptly help you find a solution.`
        )
      }

      const token = await loginServer.token
      const decodedToken = jwt.decode(token)
      const login: string = decodedToken.sub
      this.closeChromeTabIfMac(loginServer.loginCallbackUrl)
      return { login, token }
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
