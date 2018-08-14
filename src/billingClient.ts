import { HttpClient, InstanceOptions, IOContext } from '@vtex/api'
import { GraphQlError } from './errors'

export default class Billing {
  private http: HttpClient

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    this.http = HttpClient.forWorkspace('billing.vtex', ioContext, opts)
  }

  public installApp = async (appName: string, termsOfUseAccepted: boolean): Promise<InstallResponse> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", termsOfUseAccepted:${termsOfUseAccepted}) {
        code
        billingOptions
      }
    }`
    const { data: { data, errors } } = await this.http.postRaw<any>(`/_v/graphql`, { query: graphQLQuery })
    if (errors) {
      throw new GraphQlError(errors)
    }
    return data.install
  }
}
