import { ExternalClient, InstanceOptions, IOContext } from '@vtex/api'
import querystring from 'querystring'
import { IOClientFactory } from '../IOClientFactory'

export class VTEXID extends ExternalClient {
  private static TOOLBELT_API_PATH_PREFIX = '/api/vtexid/toolbelt'

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<VTEXID>(VTEXID, customContext, customOptions)
  }

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super('https://vtexid.vtex.com.br', ioContext, {
      ...opts,
      headers: {
        // DEVELOPMENT ONLY
        //  - the cookie routes to VTEX ID Beta env
        //  - remove before release
        cookie: 'vtex-commerce-env=beta',
        'X-Forwarded-For': '127.0.0.1',
      },
    })
  }

  public startToolbeltLogin({ account, secretHash, loopbackUrl }: StartToolbeltLoginInput) {
    const body = querystring.stringify({
      secretHash,
      loopbackUrl,
    })

    return this.http.post<string>(`${VTEXID.TOOLBELT_API_PATH_PREFIX}/start?an=${account}`, body)
  }

  public validateToolbeltLogin({ account, loginState, secret, ott }: ValidateToolbeltLoginInput) {
    const body = querystring.stringify({
      state: loginState,
      secret,
      ott,
    })

    return this.http.post<{ token: string }>(`${VTEXID.TOOLBELT_API_PATH_PREFIX}/validate?an=${account}`, body)
  }
}

interface StartToolbeltLoginInput {
  account: string
  secretHash: string
  loopbackUrl: string
}

interface ValidateToolbeltLoginInput {
  account: string
  loginState: string
  secret: string
  ott: string
}
