import { AppGraphQLClient, InstanceOptions, IOContext } from '@vtex/api'
import { path } from 'ramda'

export interface RedirectInput {
  id: string
  from: string
  to: string
  endDate: string
  type: RedirectTypes
  bindings: string[] | null
}

export interface Redirect {
  from: string
  to: string
  endDate: string
  type: RedirectTypes
  bindings: string[] | null
}

export enum RedirectTypes {
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
}

export class Rewriter extends AppGraphQLClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter', context, options)
  }

  public routesIndex = (): Promise<string[]> =>
    this.graphql.query<string[], {}>({
      query: `
      query RoutesIndex {
        redirect {
          index
          }
      }
      `,
      variables: {},
    }, {
      metric: 'rewriter-get-redirects-index',
    }).then(path(['data', 'redirect', 'index'])) as Promise<string[]>

  public exportRedirects = (from: number, to: number): Promise<Redirect[]> =>
    this.graphql.query<Redirect[], {from: number, to: number}>({
      query: `
      query ListRedirects($from: Int!, $to: Int!) {
        redirect {
          list(from: $from, to: $to) {
            from
            to
            type
            endDate
          }
        }
      }
      `,
      variables: {from, to},
    }, {
      metric: 'rewriter-get-redirects',
    }).then(path(['data', 'redirect', 'list'])) as Promise<Redirect[]>

  public importRedirects = (routes: RedirectInput[]): Promise<boolean> =>
    this.graphql.mutate<boolean, {routes: RedirectInput[]}>({
      mutate: `
      mutation SaveMany($routes: [RedirectInput!]!) {
        redirect {
          saveMany(routes: $routes)
        }
      }
      `,
      variables: { routes },
    }, {
      metric: 'rewriter-import-redirects',
    }).then(path(['data', 'redirect', 'saveMany'])) as Promise<boolean>

}
