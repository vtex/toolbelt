import { AppClient, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

const routes = {
  Abort: (workspace: string) => `${routes.ABTester}/finish/${workspace}`,
  ABTester: '/_v/private/abtesting',
  Initialize: (workspace: string) => `${routes.ABTester}/initialize/${workspace}`,
  InitializeLegacy: (workspace: string, probability: number) =>
    `${routes.ABTester}/initialize/${workspace}/${probability}`,
  InitializeWithParameters: (workspace: string, hours: number, proportion: number) =>
    `${routes.ABTester}/initialize/parameters/${workspace}/${hours}/${proportion}`,
  Preview: (probability: number) => `${routes.ABTester}/time/${probability}`,
  Status: () => `${routes.ABTester}/status`,
}

export class ABTester extends AppClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<ABTester>(ABTester, customContext, customOptions)
  }

  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.ab-tester@0.x', context, options)
  }

  // Abort AB Test in a workspace.
  public finish = async (workspace: string) =>
    this.http.post(routes.Abort(workspace), {}, { metric: 'abtester-finish' })

  // Start AB Test in a workspace with a given proportion of traffic and the duration of this enforcement.
  public customStart = async (workspace: string, hours: number, proportion: number) =>
    this.http.post(routes.InitializeWithParameters(workspace, hours, proportion), {}, { metric: 'abtester-start' })

  // Start AB Test in a workspace with a given probability.
  public startLegacy = async (workspace: string, probability: number) =>
    this.http.post(routes.InitializeLegacy(workspace, probability), {}, { metric: 'abtester-start' })

  // Start AB Test in a workspace.
  public start = async (workspace: string) =>
    this.http.post(routes.Initialize(workspace), {}, { metric: 'abtester-start' })

  // Get estimated AB Test duration.
  public preview = async (significanceLevel: number): Promise<number> =>
    this.http.get(routes.Preview(significanceLevel), { metric: 'abtester-preview' })

  // Get data about running AB Tests.
  public status = async () => this.http.get(routes.Status(), { metric: 'abtester-status' })
}
