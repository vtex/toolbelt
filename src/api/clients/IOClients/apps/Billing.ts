import { AppClient, InstanceOptions, IOContext } from '@vtex/api'
import { GraphQlError } from '../../../error/errors'
import { IOClientFactory } from '../IOClientFactory'

export class Billing extends AppClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Billing>(Billing, customContext, customOptions)
  }

  constructor(ioContext: IOContext, opts: InstanceOptions) {
    super('vtex.billing@0.x', ioContext, opts)
  }

  public installApp = async (
    appName: string,
    termsOfUseAccepted: boolean,
    force: boolean,
    selectedPlanId?: string
  ): Promise<InstallResponse> => {
    const graphQLQuery = `mutation InstallApps{
      install(appName:"${appName}", termsOfUseAccepted:${termsOfUseAccepted}, force:${force}${
      selectedPlanId ? `, selectedPlanId: "${selectedPlanId}"` : ''
    }) {
        code
        billingOptions
      }
    }`
    const {
      data: { data, errors },
    } = await this.http.postRaw<any>(`/_v/graphql`, { query: graphQLQuery })
    if (errors) {
      if (errors.length === 1 && errors[0].extensions?.exception?.response?.data) {
        throw errors[0].extensions.exception.response.data
      }
      throw new GraphQlError(errors)
    }
    return data.install
  }
}
