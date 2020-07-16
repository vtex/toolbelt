import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import opn from 'opn'
import querystring from 'querystring'
import { storeUrl } from '../../../storeUrl'
import { IOClientFactory } from '../IOClientFactory'

export class VTEXID extends IOClient {
  private static readonly DEFAULT_TIMEOUT = 10000
  private static readonly BASE_URL = 'https://vtexid.vtex.com.br'
  private static readonly API_PATH_PREFIX = '/api/vtexid'
  private static readonly TOOLBELT_API_PATH_PREFIX = `${VTEXID.API_PATH_PREFIX}/toolbelt`
  private static readonly VTEX_ID_AUTH_COOKIE = 'VtexIdClientAutCookie'

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<VTEXID>(VTEXID, customContext, customOptions, { requireAuth: false })
  }

  public static invalidateBrowserAuthCookie(account: string) {
    return opn(
      storeUrl({ account, addWorkspace: false, path: `${VTEXID.API_PATH_PREFIX}/pub/single-sign-out?scope=` }),
      { wait: false }
    )
  }

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super(ioContext, {
      timeout: VTEXID.DEFAULT_TIMEOUT,
      retries: 2,
      ...opts,
      baseURL: VTEXID.BASE_URL,
    })
  }

  public startToolbeltLogin({ account, secretHash, loopbackUrl }: StartToolbeltLoginInput) {
    const body = querystring.stringify({
      secretHash,
      loopbackUrl,
    })

    return this.http.post<string>(`${VTEXID.TOOLBELT_API_PATH_PREFIX}/start?an=${account}`, body)
  }

  public validateToolbeltLogin({ account, state, secret, ott }: ValidateToolbeltLoginInput) {
    const body = querystring.stringify({
      state,
      secret,
      ott,
    })

    return this.http.post<{ token: string }>(`${VTEXID.TOOLBELT_API_PATH_PREFIX}/validate?an=${account}`, body)
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
  account: string
  secretHash: string
  loopbackUrl: string
}

interface ValidateToolbeltLoginInput {
  account: string
  state: string
  secret: string
  ott: string
}
