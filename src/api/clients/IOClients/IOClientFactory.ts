import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import { Logger } from '@vtex/api/lib/service/logger'
import { Headers } from '../../constants/Headers'
import { TraceConfig } from '../../../lib/globalConfigs/traceConfig'
import userAgent from '../../../user-agent'
import * as env from '../../env'
import { SessionManager } from '../../session/SessionManager'

interface IOContextOptions {
  account?: string
  authToken?: string
  region?: string
  workspace?: string
}

export interface InstantiationOpts {
  /**
   * If the user is not logged in (there's no AuthToken stored)
   * and this option is set to true the client's functions
   * will be wrapped with a function that throws the error:
   * 'Error trying to call client before login.'
   * @default true
   */
  requireAuth?: boolean
}

const noop = () => {}

export class IOClientFactory {
  public static DEFAULT_TIMEOUT = 15000

  private static createDummyLogger() {
    const { account, workspace } = SessionManager.getSingleton()
    return ({
      account,
      workspace,
      operationId: '',
      requestId: '',
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
      sendLog: noop,
    } as unknown) as Logger
  }

  public static createIOContext(opts?: IOContextOptions): IOContext {
    const session = SessionManager.getSingleton()
    const {
      account = session.account,
      authToken = session.token,
      region = env.region(),
      workspace = session.workspace || 'master',
    } = opts ?? {}

    return {
      account,
      userAgent,
      workspace,
      authToken,
      region,
      production: false,
      product: '',
      route: {
        id: '',
        params: {},
      },
      requestId: '',
      operationId: '',
      platform: '',
      logger: IOClientFactory.createDummyLogger(),
    }
  }

  public static createClient<T extends IOClient>(
    ClientClass: typeof IOClient,
    customContext: Partial<IOContext> = {},
    customOptions: Partial<InstanceOptions> = {},
    instantiationOpts?: InstantiationOpts
  ): T {
    const { requireAuth } = { requireAuth: true, ...instantiationOpts }

    const clientOptions = IOClientFactory.createInstanceOptions(customOptions)
    const ioContext = { ...IOClientFactory.createIOContext(), ...customContext }

    if (requireAuth && !ioContext.authToken) {
      return new Proxy(
        {},
        {
          get: () => () => {
            throw new Error(`Error trying to call client before login.`)
          },
        }
      ) as T
    }

    return new ClientClass(ioContext, clientOptions) as T
  }

  private static createInstanceOptions(customOptions: Partial<InstanceOptions> = {}) {
    const traceHeader = TraceConfig.shouldTrace() ? { [Headers.VTEX_TRACE]: TraceConfig.jaegerDebugID } : null

    const defaultOptions = {
      timeout: (env.envTimeout || IOClientFactory.DEFAULT_TIMEOUT) as number,
      headers: {
        ...traceHeader,
      },
    }

    const mergedOptions = { ...defaultOptions, ...customOptions }
    mergedOptions.headers = { ...defaultOptions.headers, ...customOptions.headers }
    return mergedOptions
  }
}
