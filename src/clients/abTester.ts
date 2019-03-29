import { HttpClient, IOContext } from '@vtex/api'

const routes = {
  Abort: (workspace: string) => `${routes.ABTester}/finish/${workspace}`,
  ABTester: '/_v/private/abtesting',
  Initialize: (workspace: string, probability: number) => `${routes.ABTester}/initialize/${workspace}/${probability}`,
  Preview: (probability: number) => `${routes.ABTester}/time/${probability}`,
  Status: () => `${routes.ABTester}/status`,
}

export class ABTester {
  private http: HttpClient

  constructor (ioContext: IOContext) {
    this.http = HttpClient.forWorkspace('ab-tester.vtex', ioContext, {})
  }

  // Abort AB Test in a workspace.
  public abort = async (workspace: string) =>
    this.http.get(routes.Abort(workspace))

  // Start AB Test in a workspace with a given probability.
  public initialize = async (workspace: string, probability: number) =>
    this.http.get(routes.Initialize(workspace, probability))

  // Get estimated AB Test duration.
  public preview = async (probability: number) =>
    this.http.get(routes.Preview(probability))

  // Get data about running AB Tests.
  public status = async () => this.http.get(routes.Status())

}
