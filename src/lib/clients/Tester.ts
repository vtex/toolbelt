import { AppClient, CacheType, inflightURL, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from './IOClientFactory'

export interface SpecTestReport {
  testId: string
  title: string[]
  state: string
  body: string
  stack?: string
  error?: string
}

export interface Screenshot {
  screenshotId: string
  name?: string
  testId: string
  takenAt: string
  path: string
  height: number
  width: number
}

export interface SpecReport {
  state: 'enqueued' | 'running' | 'passed' | 'failed' | 'skipped' | 'error'
  error?: string
  report?: {
    stats: {
      suites: number
      tests: number
      passes: number
      pending: number
      skipped: number
      failures: number
    }
    tests: SpecTestReport[]
    video?: string
    logs?: string
    screenshots: Screenshot[]
  }
  logId?: string
  lastUpdate: number
}

export interface AppReport {
  [spec: string]: SpecReport
}

export interface TestReport {
  [appId: string]: AppReport
}

export interface TestOptions {
  monitoring: boolean
  integration: boolean
  authToken?: string
  appKey?: string
  appToken?: string
}

type Spec = string

export interface TestRequest {
  testId: string
  options: TestOptions
  testers: {
    [tester: string]: {
      [appId: string]: Spec[]
    }
  }
  requestedAt: number
}

export class Tester extends AppClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Tester>(Tester, customContext, customOptions)
  }

  constructor(context: IOContext, options?: InstanceOptions) {
    super('vtex.tester-hub@0.x', context, options)
  }

  public report(testId: string) {
    return this.http.get<TestReport>(`/_v/report/${testId}`, {
      inflightKey: inflightURL,
      cacheable: CacheType.None,
    })
  }

  public test(options: TestOptions, appId = '') {
    return this.http.post<TestRequest>(`/_v/test/${appId}`, options)
  }
}
