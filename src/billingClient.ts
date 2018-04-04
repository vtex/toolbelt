import {HttpClient, InstanceOptions, IOResponse} from '@vtex/api'

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

  public installApp = async (appName: string, registry: string, billingPolicyAccepted: boolean, termsOfUseAccepted: boolean): Promise<IOResponse<any>> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", registry:"${registry}", billingPolicyAccepted:${billingPolicyAccepted}, termsOfUseAccepted:${termsOfUseAccepted}) {
        installed
        billingPolicyJSON
        termsOfUse
      }
    }`
    try {
      const {data: {data, errors}} = await this.http.postRaw<any>(`/_v/graphql`, {query: graphQLQuery})
      console.log('data', data)
      console.log('errors', errors)
      return data
    } catch (e) {
      console.log('e', e)
    }
  }
}
