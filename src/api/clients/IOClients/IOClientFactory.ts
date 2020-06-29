import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import { Logger } from '@vtex/api/lib/service/logger'
import * as env from '../../env'
import userAgent from '../../../user-agent'
import { Headers } from '../../../lib/constants/Headers'
import { SessionManager } from '../../session/SessionManager'
import { TraceConfig } from '../../../lib/globalConfigs/traceConfig'

interface IOContextOptions {
  account?: string
  authToken?: string
  region?: string
  workspace?: string
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
    customOptions: Partial<InstanceOptions> = {}
  ): T {
    const clusterHeader = env.cluster() ? { [Headers.VTEX_UPSTREAM_TARGET]: env.cluster() } : null
    const traceHeader = TraceConfig.shouldTrace() ? { [Headers.VTEX_TRACE]: TraceConfig.jaegerDebugID } : null

    const defaultOptions = {
      timeout: (env.envTimeout || IOClientFactory.DEFAULT_TIMEOUT) as number,
      headers: {
        ...clusterHeader,
        ...traceHeader,
      },
    }

    const mergedOptions = { ...defaultOptions, ...customOptions }
    mergedOptions.headers = { ...defaultOptions.headers, ...customOptions.headers }

    const ioContext = {
      ...IOClientFactory.createIOContext(),
      ...customContext,
    }

    if (!ioContext.authToken) {
      return new Proxy(
        {},
        {
          get: () => () => {
            throw new Error(`Error trying to call client before login.`)
          },
        }
      ) as T
    }

    return new ClientClass(
      {
        ...IOClientFactory.createIOContext(),
        ...customContext,
      },
      mergedOptions
    ) as T
  }
}
