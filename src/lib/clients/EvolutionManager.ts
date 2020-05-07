import { AppGraphQLClient, InstanceOptions, IOContext } from '@vtex/api'
import { GraphQlError } from '../../errors'
import { TelemetryCollector } from '../telemetry/TelemetryCollector'
import { IOClientFactory } from './IOClientFactory'

export class EvolutionManager extends AppGraphQLClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<EvolutionManager>(EvolutionManager, customContext, customOptions)
  }

  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.evolution-manager-graphql@0.x', context, options)
  }

  public saveWorkspacePromotion(user: string, workspace: string): Promise<boolean> {
    return this.graphql
      .mutate<{ saveWorkspacePromotion: boolean }, { user: string; workspace: string }>(
        {
          mutate: `mutation {
            saveWorkspacePromotion(workspace: "${workspace}", agent: ${user})
          }`,
          variables: { user, workspace },
        },
        {
          metric: 'evolution-manager-workspace-promote',
        }
      )
      .then(res => {
        return res.data?.saveWorkspacePromotion
      })
      .catch(res => {
        if (res.response?.data?.code === 'NotFound') {
          TelemetryCollector.createAndRegisterErrorReport({
            originalError: res,
            message: 'vtex.evolution-manager-graphql@0.x not installed in the current account/workspace',
          })

          return false
        }

        const errors = res.response?.data?.errors
        if (!errors) {
          throw res
        }

        if (errors.length === 1 && errors[0].extensions?.exception?.response?.data) {
          throw errors[0].extensions.exception.response.data
        }

        throw new GraphQlError(errors)
      })
  }
}
