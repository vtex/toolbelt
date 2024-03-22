import asyncRetry from 'async-retry'
import coBody from 'co-body'
import detectPort from 'detect-port'
import { Server } from 'http'
import Koa from 'koa'
import logger from '../../../../api/logger'
import { ErrorKinds } from '../../../../api/error/ErrorKinds'
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
  private static readonly SERVER_START_RETRIES = 1
  private static readonly HOSTNAME = '127.0.0.1'

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

    return `http://${LoginServer.HOSTNAME}:${this.port}${LoginServer.LOGIN_CALLBACK_PATH}`
  }

  public setLoginState(val: string) {
    this.loginState = val
  }

  public start() {
    return asyncRetry(
      async (bail, attemptNumber) => {
        try {
          // detectPort will get the specified port or, if it's in use, another ramdom unnused port
          this.port = await detectPort(3000)
          this.server = await this.initServer(this.port)
          logger.debug(`LoginServer started on http://${LoginServer.HOSTNAME}:${this.port}`)
        } catch (err) {
          logger.debug(`LoginServer failed to start on port:${this.port}. Reason: ${err.message}.`)
          if (err.code !== 'EADDRINUSE') {
            return bail(err)
          }

          if (attemptNumber < LoginServer.SERVER_START_RETRIES + 1) {
            logger.debug(`Retrying to start LoginServer...`)
          }

          throw ErrorReport.createAndMaybeRegisterOnTelemetry({
            originalError: err,
            kind: ErrorKinds.LOGIN_SERVER_START_ERROR,
            details: { attemptNumber },
          })
        }
      },
      { retries: LoginServer.SERVER_START_RETRIES, maxTimeout: 100, minTimeout: 100 }
    )
  }

  public close() {
    this.server.unref()
    this.server.close()
  }

  private initServer(port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(port, LoginServer.HOSTNAME, () => {
        server.on('connection', socket => {
          socket.unref()
        })

        server.removeListener('error', reject)
        resolve(server)
      })

      server.on('error', reject)
    })
  }

  private registerLoginHandler() {
    this.app.use(async ctx => {
      ctx.set('connection', 'close')

      if (ctx.path !== LoginServer.LOGIN_CALLBACK_PATH) {
        ctx.status = 404
        ctx.body = 'Not found'
        return
      }

      ctx.socket.ref()
      logger.debug(`Received ${ctx.method} login callback`)
      if (!this.loginState) {
        return this.handleError(ctx, new Error('Received login callback before setting login state'))
      }

      if (ctx.method.toLowerCase() === 'options') {
        ctx.set('Access-Control-Allow-Origin', '*')
        ctx.status = 200
        return
      }

      let body
      if (ctx.method.toLowerCase() === 'post') {
        try {
          body = await coBody(ctx.req)
        } catch (err) {
          return this.handleError(ctx, err)
        }
      } else {
        body = { ott: ctx.query?.ott }
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
          state: this.loginState,
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
