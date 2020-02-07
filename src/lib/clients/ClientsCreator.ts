import { InstanceOptions, IOContext, Workspaces } from '@vtex/api'
import { dummyLogger } from '../../clients/dummyLogger'
import * as env from '../../env'
import envTimeout from '../../timeout'
import * as pkg from '../package.json'

interface SessionIO {
  account: string
  authToken: string
  workspace: string
}

interface SessionIOWithRegion extends SessionIO {
  region: string
}

export class ClientsCreator {
  private static readonly DEFAULT_TIMEOUT = Number(envTimeout || 15000)
  private static readonly DEFAULT_OPTIONS = {
    timeout: ClientsCreator.DEFAULT_TIMEOUT,
    headers: {
      ...(env.cluster() ? { 'x-vtex-upstream-target': env.cluster() } : null),
    },
  }

  private static singletonInstance: ClientsCreator = null

  public getClientsCreator() {
    if (ClientsCreator.singletonInstance) {
      return ClientsCreator.singletonInstance
    }

    ClientsCreator.singletonInstance = new ClientsCreator(env.region())
    return ClientsCreator.singletonInstance
  }

  private static createIOContext({ account, authToken, region, workspace }: SessionIOWithRegion): IOContext {
    return {
      account,
      workspace,
      authToken,
      region,
      userAgent: `Toolbelt/${pkg.version}`,
      production: false,
      product: '',
      route: {
        id: '',
        params: {},
      },
      requestId: '',
      operationId: '',
      platform: '',
      logger: dummyLogger,
    }
  }

  private static mergeCustomOptionsWithDefault(customOptions: InstanceOptions = {}): InstanceOptions {
    const mergedOptions = { ...ClientsCreator.DEFAULT_OPTIONS, ...customOptions }
    mergedOptions.headers = { ...ClientsCreator.DEFAULT_OPTIONS.headers, ...customOptions.headers }
    return mergedOptions
  }

  constructor(private readonly region: string) {}

  private createRegionalIOContext(ioSession: SessionIO) {
    return ClientsCreator.createIOContext({ ...ioSession, region: this.region })
  }

  public createWorkspaceClient(ioSession: SessionIO, customOptions: InstanceOptions = {}) {
    return new Workspaces(
      this.createRegionalIOContext(ioSession),
      ClientsCreator.mergeCustomOptionsWithDefault(customOptions)
    )
  }
}
