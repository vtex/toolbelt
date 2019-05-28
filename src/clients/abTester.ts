import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

const routes = {
  Abort: (workspace: string) => `${routes.ABTester}/finish/${workspace}`,
  ABTester: '/_v/private/abtesting',
  Initialize: (workspace: string, probability: number) => `${routes.ABTester}/initialize/${workspace}/${probability}`,
  Preview: (probability: number) => `${routes.ABTester}/time/${probability}`,
  Status: () => `${routes.ABTester}/status`,
}

export class ABTester extends AppClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.ab-tester', context, options)
  }

  // Abort AB Test in a workspace.
  public finish = async (workspace: string) =>
    this.http.post(routes.Abort(workspace), {}, { metric: 'abtester-finish' })

  // Start AB Test in a workspace with a given probability.
  public start = async (workspace: string, probability: number) =>
    this.http.post(routes.Initialize(workspace, probability), {}, { metric: 'abtester-start' })

  // Get estimated AB Test duration.
  public preview = async (significanceLevel: number): Promise<number> =>
    this.http.get(routes.Preview(significanceLevel), { metric: 'abtester-preview' })

  // Get data about running AB Tests.
  public status = async () => this.http.get(routes.Status(), { metric: 'abtester-status' })

}
