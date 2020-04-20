import { AppClient, IOContext, InstanceOptions } from '@vtex/api'
import { stringify } from 'querystring'

const LH_TIMEOUT = 1e5

export class Lighthouse extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.lighthouse@0.x', ioContext, {
      ...opts,
      timeout: LH_TIMEOUT,
    })
  }

  public runAudit(url: string): Promise<any[]> {
    return this.http.post('/_v/toolbelt/audit/url', { url })
  }

  public getReports(app: string, url: string): Promise<any[]> {
    const params: Record<string, string> = {}

    if (app) {
      params.app = app
    }

    if (url) {
      params.url = url
    }

    const path = `/_v/toolbelt/reports?${stringify(params)}`
    return this.http.get(path)
  }
}
