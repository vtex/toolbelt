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

interface RoutesIndex {
  [route: string]: string
}

export enum RedirectTypes {
  PERMANENT = 'permanent',
  TEMPORARY = 'temporary',
}

export class Rewriter extends AppGraphQLClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter', context, options)
  }

  public routesIndex = (): Promise<RoutesIndex> =>
    this.graphql.query<RoutesIndex, {}>({
      query: `
      query RoutesIndex() {
        routesIndex()
      }
      `,
      variables: {},
    }, {
      metric: 'rewriter-get-redirects-index',
    }).then(path(['data', 'routesIndex'])) as Promise<RoutesIndex>

  public exportRedirects = (from: number, to: number): Promise<Redirect[]> =>
    this.graphql.query<Redirect[], {from: string, to: string}>({
      query: `
      query ListRedirects($from: String, $to: String) {
        redirects {
          list(from: $from, to: $to)
        }
      }
      `,
      variables: {from: from.toString(), to: to.toString()},
    }, {
      metric: 'rewriter-get-redirects',
    }).then(path(['data', 'redirects', 'list'])) as Promise<Redirect[]>

  public importRedirects = (args: RedirectInput[]): Promise<boolean> =>
    this.graphql.mutate<boolean, {args: RedirectInput[]}>({
      mutate: `
      mutation SaveMany($args: RedirectInput[]) {
        redirects {
          saveMany(args: $args)
        }
      }
      `,
      variables: { args },
    }, {
      metric: 'rewriter-import-redirects',
    }).then(path(['data', 'redirects', 'saveMany'])) as Promise<boolean>

}
