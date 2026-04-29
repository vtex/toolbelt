import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import querystring from 'querystring'
import { parseSetCookie } from 'set-cookie-parser'
import { storeUrl } from '../../../storeUrl'
import { IOClientFactory } from '../IOClientFactory'
import { switchOpen } from '../../../../modules/featureFlag/featureFlagDecider'

interface RefreshResponse {
  status: string
  userId: string | null
  refreshAfter: string | null
}

export class RefreshFailedError extends Error {}

export class VTEXID extends IOClient {
  private static readonly DEFAULT_TIMEOUT = 10000
  private static readonly DEFAULT_RETRIES = 2
  private static readonly API_PATH_PREFIX = '/api/vtexid'
  private static readonly TOOLBELT_API_PATH_PREFIX = `${VTEXID.API_PATH_PREFIX}/toolbelt`
  private static readonly VTEX_ID_AUTH_COOKIE = 'VtexIdclientAutCookie'
  private static readonly VTEX_ID_REFRESH_TOKEN_COOKIE = 'vid_rt'

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<VTEXID>(VTEXID, customContext, customOptions, { requireAuth: false })
  }

  public static async invalidateBrowserAuthCookie(account: string) {
    return switchOpen(
      storeUrl({ account, addWorkspace: false, path: `${VTEXID.API_PATH_PREFIX}/pub/single-sign-out?scope=` }),
      { wait: false }
    )
  }

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super(ioContext, {
      timeout: VTEXID.DEFAULT_TIMEOUT,
      retries: VTEXID.DEFAULT_RETRIES,
      ...opts,
      baseURL: `https://${ioContext.account}.myvtex.com`,
    })
  }

  public startToolbeltLogin({ secretHash, loopbackUrl }: StartToolbeltLoginInput) {
    const body = querystring.stringify({
      secretHash,
      loopbackUrl,
    })

    return this.http.post<string>(`${VTEXID.TOOLBELT_API_PATH_PREFIX}/start`, body)
  }

  public validateToolbeltLogin({ state, secret, ott }: ValidateToolbeltLoginInput) {
    const body = querystring.stringify({
      state,
      secret,
      ott,
    })

    return this.http.post<{ token: string; refresh_token?: string }>(
      `${VTEXID.TOOLBELT_API_PATH_PREFIX}/validate`,
      body
    )
  }

  public async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const { data, headers } = await this.http.postRaw<RefreshResponse>(
      `${VTEXID.API_PATH_PREFIX}/refreshtoken/admin`,
      null,
      {
        headers: {
          Cookie: `${VTEXID.VTEX_ID_REFRESH_TOKEN_COOKIE}=${refreshToken}`,
        },
      }
    )

    if (data.status !== 'Success') {
      throw new RefreshFailedError(`Failed to refresh: status ${data.status}.`)
    }

    const setCookieHeader = headers['set-cookie']
    const cookieMap = parseSetCookie(setCookieHeader ?? [], { map: true })
    const token = cookieMap[VTEXID.VTEX_ID_AUTH_COOKIE]?.value
    const newRefreshToken = cookieMap[VTEXID.VTEX_ID_REFRESH_TOKEN_COOKIE]?.value

    if (token == null || newRefreshToken == null || token === '' || newRefreshToken === '') {
      throw new RefreshFailedError(
        'Failed to refresh: Set-Cookie headers did not include both VtexIdclientAutCookie and vid_rt cookies.'
      )
    }

    return { token, refreshToken: newRefreshToken }
  }

  public invalidateToolbeltToken(token: string) {
    return this.http.get(`/api/vtexid/pub/logout?scope=`, {
      headers: {
        Cookie: `${VTEXID.VTEX_ID_AUTH_COOKIE}=${token}`,
      },
    })
  }
}

interface StartToolbeltLoginInput {
  secretHash: string
  loopbackUrl: string
}

interface ValidateToolbeltLoginInput {
  state: string
  secret: string
  ott: string
}
