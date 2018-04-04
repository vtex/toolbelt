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

  public installApp = async (appName: string, registry: string, billingPolicyAccepted: boolean, termsOfUseAccepted: boolean): Promise<InstallResponse> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", registry:"${registry}", billingPolicyAccepted:${billingPolicyAccepted}, termsOfUseAccepted:${termsOfUseAccepted}) {
        installed
        billingPolicyJSON
      }
    }`
    try {
      const {data: {data, errors}} = await this.http.postRaw<any>(`/_v/graphql`, {query: graphQLQuery})
      if (errors) {
        throw errors
      }
      // console.log('data', data)
      return data.install
    } catch (e) {
      if (e.response && e.response.data && e.response.data.errors) {
        console.log('error: ', e.response.data.errors)
      } else {
        console.log('error: ', e)
      }
    }
  }
}
