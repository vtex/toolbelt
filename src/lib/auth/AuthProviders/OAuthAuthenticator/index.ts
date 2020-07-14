import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import opn from 'opn'
import { join } from 'path'
import { VTEXID } from '../../../../api/clients/IOClients/external/VTEXID'
import logger from '../../../../api/logger'
import { randomCryptoString } from '../../../utils/randomCryptoString'
import { spawnUnblockingChildProcess } from '../../../utils/spawnUnblockingChildProcess'
import { AuthProviderBase } from '../AuthProviderBase'
import { LoginServer } from './LoginServer'

export class OAuthAuthenticator extends AuthProviderBase {
  public static readonly AUTH_TYPE = 'oauth'
  private static readonly SECRET_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

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

      opn(this.loginUrl(account, loginState), { wait: false })

      const token = await loginServer.token
      const decodedToken = jwt.decode(token)
      const login: string = decodedToken.sub
      this.closeChromeTabIfMac(loginServer.loginCallbackUrl)
      return { login, token }
    } finally {
      await loginServer.close()
      logger.debug('Closed login server')
    }
  }

  private loginUrl(account: string, loginState: string) {
    const loginPath = `${account}.myvtex.com/_v/segment/admin-login/v1/login`
    const returnUrl = `/api/vtexid/toolbelt/callback?state=${encodeURIComponent(loginState)}`
    return `https://${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}`
  }

  private hashSecret(secret: string) {
    return createHash('sha256')
      .update(secret)
      .digest('base64')
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
