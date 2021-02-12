import { AppClient, CacheType, InstanceOptions, IOContext, RequestConfig } from '@vtex/api'
import { ChangeToSend } from '../../../modules/apps/ProjectUploader'
import { Headers } from '../../../constants/Headers'
import { ErrorKinds } from '../../../error/ErrorKinds'
import { ErrorReport } from '../../../error/ErrorReport'
import { IOClientFactory } from '../IOClientFactory'
import { NewStickyHostError } from '../../../error/errors'
import { TypingsInfo, TypingsInfoResponse } from 'BuilderHub'

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
  private static TOO_MANY_HOST_CHANGES = 4

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Builder>(Builder, customContext, customOptions)
  }

  private stickyHost!: string
  private hostChanges = 0

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
    linkID: string,
    zipFile: Buffer,
    stickyOptions: StickyOptions = { sticky: true },
    params: RequestParams = {}
  ) => {
    return this.sendZipFile(routes.link(app), app, zipFile, stickyOptions, params, { [Headers.VTEX_LINK_ID]: linkID })
  }

  public relinkApp = async (app: string, changes: ChangeToSend[], linkID: string, params: RequestParams = {}) => {
    const headers = {
      ...(this.stickyHost && { [Headers.VTEX_STICKY_HOST]: this.stickyHost }),
      [Headers.VTEX_LINK_ID]: linkID,
      'Content-Type': 'application/json',
    }
    const metric = 'bh-relink'

    const putConfig: RequestConfig = { url: routes.relink(app), method: 'put', data: changes, headers, metric, params }
    const {
      data,
      headers: { [Headers.VTEX_STICKY_HOST]: host, [Headers.VTEX_TRACE_ID]: traceID },
    } = await (this.http as any).request(putConfig)
    this.updateStickyHost(this.stickyHost, host, traceID, true)
    return data as BuildResult
  }

  public builderHubTsConfig = () => {
    return this.http.get(routes.tsConfig)
  }

  public typingsInfo = async (): Promise<TypingsInfo> => {
    const res = await this.http.get<TypingsInfoResponse>(routes.typings)
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
    const stickyHostHeader = this.stickyHost || hint

    const {
      data,
      headers: { [Headers.VTEX_STICKY_HOST]: host, [Headers.VTEX_TRACE_ID]: traceID },
    } = await this.http.postRaw<BuildResult>(route, zipFile, {
      headers: {
        ...(sticky && { [Headers.VTEX_STICKY_HOST]: stickyHostHeader }),
        ...requestHeaders,
        'Content-length': zipFile.byteLength,
        'Content-Type': 'application/octet-stream',
      },
      metric,
      params,
    })

    if (sticky) {
      this.updateStickyHost(stickyHostHeader, host, traceID)
    }

    return data
  }

  private updateStickyHost(
    sentStickyHostHeader: string,
    responseStickyHostHeader: string,
    traceID: string,
    relinkCall?: boolean
  ) {
    if (!responseStickyHostHeader) {
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.STICKY_HOST_ERROR,
        originalError: new Error('Missing sticky-host on builder-hub response'),
        details: { traceID, sentStickyHostHeader },
      })
    } else if (this.stickyHost && responseStickyHostHeader !== this.stickyHost) {
      this.hostChanges += 1
      if (this.hostChanges >= Builder.TOO_MANY_HOST_CHANGES) {
        ErrorReport.createAndMaybeRegisterOnTelemetry({
          kind: ErrorKinds.STICKY_HOST_ERROR,
          originalError: new Error(`Too many builder-hub host changes`),
          details: {
            traceID,
            sentStickyHostHeader,
            responseStickyHostHeader,
            hostChanges: this.hostChanges,
          },
        })
      }
      if (relinkCall) {
        throw new NewStickyHostError('Relink', 'New StickyHost on relink')
      }
    }

    this.stickyHost = responseStickyHostHeader
  }
}
