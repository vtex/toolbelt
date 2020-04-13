import { AppClient, CacheType, InstanceOptions, IOContext } from '@vtex/api'
import { ChangeToSend } from '../modules/apps/ProjectUploader'

interface StickyOptions {
  sticky?: boolean
  stickyHint?: string
  tag?: string
}

export interface RequestParams {
  tsErrorsAsWarnings?: boolean
  skipSemVerEnsure?: boolean
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
      'x-vtex-sticky-host': stickyHint,
    }
    const metric = 'bh-availability'
    const {
      data: { availability },
      headers: { 'x-vtex-sticky-host': host },
    } = await this.http.getRaw(routes.availability(app), { headers, metric, cacheable: CacheType.None })
    const { hostname, score } = availability as AvailabilityResponse
    return { host, hostname, score }
  }

  public clean = (app: string) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.stickyHost && { 'x-vtex-sticky-host': this.stickyHost }),
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
    params: RequestParams = {}
  ) => {
    return this.sendZipFile(routes.link(app), app, zipFile, stickyOptions, params)
  }

  public relinkApp = (app: string, changes: ChangeToSend[], params: RequestParams = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.stickyHost && { 'x-vtex-sticky-host': this.stickyHost }),
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
    requestParams: RequestParams = {}
  ) => {
    const hint = stickyHint || `request:${this.context.account}:${this.context.workspace}:${app}`
    const metric = 'bh-zip-send'
    const params = tag ? { ...requestParams, tag } : requestParams
    const {
      data,
      headers: { 'x-vtex-sticky-host': host },
    } = await this.http.postRaw<BuildResult>(route, zipFile, {
      headers: {
        'Content-length': zipFile.byteLength,
        'Content-Type': 'application/octet-stream',
        ...(sticky && { 'x-vtex-sticky-host': this.stickyHost || hint }),
      },
      metric,
      params,
    })

    this.stickyHost = host
    return data
  }
}
