import {HttpClient, InstanceOptions, IOResponse} from '@vtex/api'
import CustomGraphQLError from './modules/errors/customGraphQLError'

const throwOnErrors = (message) => (response) => {
  if (response.data && response.data.errors && response.data.errors.length > 0) {
    throw new CustomGraphQLError(message, response.data.errors)
  }
  return response
}

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

  public installApp = (appName: string, registry: string, billingPolicyAccepted: boolean, termsOfUseAccepted: boolean): Promise<IOResponse<any>> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", registry:"${registry}", billingPolicyAccepted:${billingPolicyAccepted}, termsOfUseAccepted:${termsOfUseAccepted}) {
        installed
        billingPolicyJSON
        termsOfUse
      }
    }`
    return this.http.postRaw<any>(`/_v/graphql`, {
      data: {query: graphQLQuery},
    })
    .then(throwOnErrors('Error fetching install/billing data from vtex.billing'))
    .then(({data: billingData}) => {
      return {
        data: {
          installed: billingData.installed,
          billingPolicyJSON: JSON.parse(billingData.billingPolicyJSON),
          termsOfUse: billingData.termsOfUse,
        },
      }
    })
  }
}
