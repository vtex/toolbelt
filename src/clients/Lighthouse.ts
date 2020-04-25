import { AppClient, IOContext, InstanceOptions } from '@vtex/api'
import { stringify } from 'querystring'

const LH_TIMEOUT_MS = 1e5

export class Lighthouse extends AppClient {
  constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('vtex.lighthouse@0.x', ioContext, {
      ...opts,
      timeout: LH_TIMEOUT_MS,
    })
  }

  /**
   * This request a Lightouse audit for a url. Lighthouse audit process runs on the current workspace
   *
   * @param url The url that lightouse must audit
   */
  public runAudit(url: string): Promise<ShortReportObject[]> {
    return this.http.post('/_v/toolbelt/audit/url', { url })
  }

  /**
   * Returns a list of previous lighthouse reports stored on masterdata
   *
   * @param app App name to filter query results
   * @param url Url to filter query results
   */
  public getReports(app: string, url: string): Promise<ShortReportObject[]> {
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

export interface LighthouseReportDoc {
  app: string
  version: string
  url: string
  generatedAt: number
  additionalReport: AdditionalReportObject
  shortReport: ShortReportObject[]
}

export interface ShortReportObject {
  audits: ShortAuditObject[]
  score: number
  title: string
}

interface ShortAuditObject {
  title: string
  description: string
  score: number
  scoreDisplayValue: string
  numericValue: number
  displayValue: string
  weight: 3
}

interface AdditionalReportObject {
  userAgent: string
  environment: any
  lighthouseVersion: string
  fetchTime: string
  requestedUrl: string
  finalUrl: string
  runWarnings: any[]
  configSettings: any
  categoryGroups: any
  timing: any
  i18n: any
  stackPacks: any[]
}
