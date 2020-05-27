import { AppClient, CacheType, InstanceOptions, IOContext } from '@vtex/api'
import { ChangeToSend } from '../../../../modules/apps/ProjectUploader'
import { Headers } from '../../../constants/Headers'
import { IOClientFactory } from '../IOClientFactory'

interface StickyOptions {
  sticky?: boolean
  stickyHint?: string
  tag?: string
}

export interface RequestParams {
  tsErrorsAsWarnings?: boolean
  skipSemVerEnsure?: boolean
}

export interface BuilderHubRequestOptions {
  params?: RequestParams
  headers?: Record<string, any>
}

export interface BuildResult {
  availability?: AvailabilityResponse
  code?: string
  message?: any
  timeNano?: number
}

export interface AvailabilityResponse {
  host: string | undefined
  hostname: string | undefined
  score: number
}

const builderBaseRoute = `/_v/builder/0`
const routes = {
  tsConfig: `${builderBaseRoute}/tsconfig`,
  typings: `${builderBaseRoute}/typings`,
  availability: (app: string) => `${routes.builder}/availability/${app}`,
  builder: builderBaseRoute,
  clean: (app: string) => `${routes.builder}/clean/${app}`,
  link: (app: string) => `${routes.builder}/link/${app}`,
  pinnedDependencies: () => `${routes.builder}/pinneddeps`,
  publish: (app: string) => `${routes.builder}/publish/${app}`,
  relink: (app: string) => `${routes.builder}/relink/${app}`,
  test: (app: string) => `${routes.builder}/test/${app}`,
}

export class Builder extends AppClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Builder>(Builder, customContext, customOptions)
  }

  private stickyHost!: string

  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.builder-hub@0.x', ioContext, opts)
  }

  public availability = async (app: string, hintIndex: number) => {
    const stickyHint =
      hintIndex === undefined || hintIndex === null
        ? `request:${this.context.account}:${this.context.workspace}:${app}`
        : `request:${this.context.account}:${this.context.workspace}:${app}:${hintIndex}`
    const headers = {
      'Content-Type': 'application/json',
      [Headers.VTEX_STICKY_HOST]: stickyHint,
    }
    const metric = 'bh-availability'
    const {
      data: { availability },
      headers: { [Headers.VTEX_STICKY_HOST]: host },
    } = await this.http.getRaw(routes.availability(app), { headers, metric, cacheable: CacheType.None })
    const { hostname, score } = availability as AvailabilityResponse
    return { host, hostname, score }
  }

  public clean = (app: string) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.stickyHost && { [Headers.VTEX_STICKY_HOST]: this.stickyHost }),
    }
    const metric = 'bh-clean'
    return this.http.post<BuildResult>(routes.clean(app), { headers, metric })
  }

  public getPinnedDependencies = () => {
    return this.http.get(routes.pinnedDependencies())
  }

  public publishApp = (
    app: string,
    zipFile: Buffer,
    stickyOptions: StickyOptions = { sticky: true },
    params: RequestParams = {}
  ) => {
    return this.sendZipFile(routes.publish(app), app, zipFile, stickyOptions, params)
  }

  public testApp = (
    app: string,
    zipFile: Buffer,
    stickyOptions: StickyOptions = { sticky: true },
    params: RequestParams = {}
  ) => {
    return this.sendZipFile(routes.test(app), app, zipFile, stickyOptions, params)
  }

  public linkApp = (
    app: string,
    zipFile: Buffer,
    stickyOptions: StickyOptions = { sticky: true },
    params: RequestParams = {},
    requestHeaders: Record<string, any> = {}
  ) => {
    return this.sendZipFile(routes.link(app), app, zipFile, stickyOptions, params, requestHeaders)
  }

  public relinkApp = (
    app: string,
    changes: ChangeToSend[],
    headersParams: Record<string, any>,
    params: RequestParams = {}
  ) => {
    const headers = {
      ...(this.stickyHost && { [Headers.VTEX_STICKY_HOST]: this.stickyHost }),
      ...headersParams,
      'Content-Type': 'application/json',
    }
    const metric = 'bh-relink'
    return this.http.put<BuildResult>(routes.relink(app), changes, { headers, metric, params })
  }

  public builderHubTsConfig = () => {
    return this.http.get(routes.tsConfig)
  }

  public typingsInfo = async () => {
    const res = await this.http.get(routes.typings)
    return res.typingsInfo
  }

  private sendZipFile = async (
    route: string,
    app: string,
    zipFile: Buffer,
    { tag, sticky, stickyHint }: StickyOptions = {},
    requestParams: RequestParams = {},
    requestHeaders: Record<string, any> = {}
  ) => {
    const hint = stickyHint || `request:${this.context.account}:${this.context.workspace}:${app}`
    const metric = 'bh-zip-send'
    const params = tag ? { ...requestParams, tag } : requestParams
    const {
      data,
      headers: { [Headers.VTEX_STICKY_HOST]: host },
    } = await this.http.postRaw<BuildResult>(route, zipFile, {
      headers: {
        ...(sticky && { [Headers.VTEX_STICKY_HOST]: this.stickyHost || hint }),
        ...requestHeaders,
        'Content-length': zipFile.byteLength,
        'Content-Type': 'application/octet-stream',
      },
      metric,
      params,
    })

    this.stickyHost = host
    return data
  }
}
