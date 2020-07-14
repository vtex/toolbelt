import asyncRetry from 'async-retry'
import coBody from 'co-body'
import getPort from 'get-port'
import { Server } from 'http'
import Koa from 'koa'
import { logger } from '../../../../api'
import { VTEXID } from '../../../../api/clients/IOClients/external/VTEXID'
import { ErrorReport } from '../../../../api/error/ErrorReport'

const SUCCESS_PAGE = `
<!doctype html>
<html>
  <head>
    <title>Success</title>
    <meta charset="utf-8">
  </head>
  <body>
    <p> Você já pode fechar essa janela. </p>
    <p> You may now close this window. </p>
    <p> Ahora puedes cerrar esta ventana. </p>
  </body>
</html>`

export class LoginServer {
  private static readonly LOGIN_CALLBACK_PATH = '/login_callback'

  public static async create(loginConfig: LoginConfig) {
    const loginServer = new LoginServer(loginConfig)
    await loginServer.start()
    return loginServer
  }

  private app: Koa
  private port: number
  private server: Server

  private loginState?: string

  private tokenPromise: Promise<string>
  private resolveTokenPromise: (val: string) => void
  private rejectTokenPromise: (err: any) => void

  constructor(private loginConfig: LoginConfig) {
    this.app = new Koa()
    this.registerLoginHandler()

    this.tokenPromise = new Promise((resolve, reject) => {
      this.resolveTokenPromise = resolve
      this.rejectTokenPromise = reject
    })
  }

  get token() {
    return this.tokenPromise
  }

  get loginCallbackUrl() {
    if (!this.port) {
      throw new Error('LoginServer not initialized')
    }

    return `http://localhost:${this.port}${LoginServer.LOGIN_CALLBACK_PATH}`
  }

  public setLoginState(val: string) {
    this.loginState = val
  }

  public start() {
    return asyncRetry(
      async bail => {
        try {
          const port = await getPort({
            port: getPort.makeRange(3000, 3050),
          })

          this.server = await this.initServer(port)
          this.port = port
          logger.debug(`LoginServer started on http://localhost:${this.port}`)
        } catch (err) {
          logger.debug(`LoginServer failed to start on port:${this.port}. Reason: ${err.message}.`)
          if (err.code !== 'EADDRINUSE') {
            return bail(err)
          }
        }
      },
      { retries: 2, maxTimeout: 50, minTimeout: 50 }
    )
  }

  public close() {
    return new Promise(resolve => {
      this.server.close(resolve)
    })
  }

  private initServer(port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
      this.app.on('error', reject)
      const server = this.app.listen(port, () => {
        resolve(server)
      })
    })
  }

  private registerLoginHandler() {
    this.app.use(async ctx => {
      ctx.set('connection', 'close')
      if (ctx.method !== 'POST' || ctx.path !== LoginServer.LOGIN_CALLBACK_PATH) {
        return this.handleError(ctx, new Error('LoginServer received invalid HTTP call'), {
          method: ctx.method,
          path: ctx.path,
        })
      }

      logger.debug('Received login callback')
      if (!this.loginState) {
        return this.handleError(ctx, new Error('Received login callback before setting login state'))
      }

      let body
      try {
        body = await coBody(ctx.req)
      } catch (err) {
        return this.handleError(ctx, err)
      }

      if (!body.ott) {
        return this.handleError(ctx, new Error('Missing ott on VTEX ID callback call'), { body })
      }

      const vtexId = VTEXID.createClient({ account: this.loginConfig.account })
      try {
        const { token } = await vtexId.validateToolbeltLogin({
          account: this.loginConfig.account,
          secret: this.loginConfig.secret,
          ott: body.ott,
          loginState: this.loginState,
        })

        this.resolveTokenPromise(token)
        ctx.status = 200
        ctx.set('content-type', 'text/html')
        ctx.body = SUCCESS_PAGE
      } catch (err) {
        return this.handleError(ctx, err)
      }
    })
  }

  private handleError(ctx: Koa.ParameterizedContext, err: any, details?: Record<string, any>) {
    const errReport = ErrorReport.createAndMaybeRegisterOnTelemetry({ originalError: err, details })
    ctx.status = 500
    ctx.body = {
      errorId: errReport.metadata.errorId,
      message: errReport.message,
    }

    this.rejectTokenPromise(errReport)
  }
}

interface LoginConfig {
  account: string
  secret: string
}
