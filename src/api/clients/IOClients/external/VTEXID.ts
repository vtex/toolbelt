import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import open from 'open'
import opn from 'opn'
import querystring from 'querystring'
import { ErrorReport } from '../../../error/ErrorReport'
import { storeUrl } from '../../../storeUrl'
import { ToolbeltConfig } from '../apps/ToolbeltConfig'
import { IOClientFactory } from '../IOClientFactory'
import { ErrorKinds } from '../../../error/ErrorKinds'

export class VTEXID extends IOClient {
  private static readonly DEFAULT_TIMEOUT = 10000
  private static readonly DEFAULT_RETRIES = 2
  private static readonly BASE_URL = 'https://vtexid.vtex.com.br'
  private static readonly API_PATH_PREFIX = '/api/vtexid'
  private static readonly TOOLBELT_API_PATH_PREFIX = `${VTEXID.API_PATH_PREFIX}/toolbelt`
  private static readonly VTEX_ID_AUTH_COOKIE = 'VtexIdClientAutCookie'

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<VTEXID>(VTEXID, customContext, customOptions, { requireAuth: false })
  }

  public static async invalidateBrowserAuthCookie(account: string) {
    try {
      const configClient = ToolbeltConfig.createClient()
      const { featureFlags } = await configClient.getGlobalConfig()

      if (featureFlags.FEATURE_FLAG_NEW_OPEN_PACKAGE) {
        return opn(
          storeUrl({ account, addWorkspace: false, path: `${VTEXID.API_PATH_PREFIX}/pub/single-sign-out?scope=` }),
          { wait: false }
        )
      }
      return open(
        storeUrl({ account, addWorkspace: false, path: `${VTEXID.API_PATH_PREFIX}/pub/single-sign-out?scope=` }),
        { wait: false }
      )
    } catch (err) {
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.TOOLBELT_CONFIG_FEATURE_FLAG_ERROR,
        originalError: err,
      }).logErrorForUser({ coreLogLevelDefault: 'debug' })
    }
  }

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super(ioContext, {
      timeout: VTEXID.DEFAULT_TIMEOUT,
      retries: VTEXID.DEFAULT_RETRIES,
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
