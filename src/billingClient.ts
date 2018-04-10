import {HttpClient, InstanceOptions} from '@vtex/api'

export default class Billing {
  private http: HttpClient

  constructor (opts: InstanceOptions) {
    const {account, workspace, authToken, cacheStorage, region, userAgent} = opts

    this.http = HttpClient.forWorkspace('billing.vtex', {
      account,
      authToken,
      cacheStorage,
      region,
      userAgent,
      workspace,
    })
  }

  public installApp = async (appName: string, registry: string, termsOfUseAccepted: boolean): Promise<InstallResponse> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", registry:"${registry}", termsOfUseAccepted:${termsOfUseAccepted}) {
        installed
        billingOptions
      }
    }`
    try {
      const {data: {data, errors}} = await this.http.postRaw<any>(`/_v/graphql`, {query: graphQLQuery})
      if (errors) {
        throw errors
      }
      return data.install
    } catch (e) {
      throw e
    }
  }
}
