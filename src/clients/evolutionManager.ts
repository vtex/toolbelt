import { InstanceOptions, IOContext, AppGraphQLClient } from '@vtex/api'
import { GraphQlError } from '../errors'

export class EvolutionManager extends AppGraphQLClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.evolution-manager-graphql@0.x', context, options)
  }

  public saveWorkspacePromotion = (user: string, workspace: string): Promise<boolean> =>
    this.graphql
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
        const errors = res.response?.data?.errors
        if (!errors) {
          throw new Error('Unknown error while saving promotion in evolution manager.')
        }
        if (errors.length === 1 && errors[0].extensions?.exception?.response?.data) {
          throw errors[0].extensions.exception.response.data
        }
        throw new GraphQlError(errors)
      })
}
