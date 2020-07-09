import { AppGraphQLClient, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export interface RedirectInput {
  id: string
  from: string
  to: string
  endDate: string
  type: RedirectTypes
  binding: string
}

export interface Redirect {
  from: string
  to: string
  endDate: string
  type: RedirectTypes
  binding: string
}

export enum RedirectTypes {
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
}

export interface ExportResponse {
  routes: Redirect[]
  next: string
}

export class Rewriter extends AppGraphQLClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Rewriter>(Rewriter, customContext, customOptions)
  }

  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter@1.x', context, {
      ...options,
      headers: { ...options.headers, 'cache-control': 'no-cache' },
      retries: 5,
      timeout: 10000,
    })
  }

  public exportRedirects = (next?: string): Promise<ExportResponse> =>
    this.graphql
      .query<{ redirect: { listRedirects: ExportResponse } }, { next: string }>(
        {
          query: `
      query ListRedirects($next: String) {
        redirect {
          listRedirects(next: $next) {
            next
            routes {
              binding
              from
              to
              type
              endDate
            }
          }
        }
      }
      `,
          variables: { next },
        },
        {
          metric: 'rewriter-get-redirects',
        }
      )
      .then(res => res.data?.redirect?.listRedirects) as Promise<ExportResponse>

  public importRedirects = (routes: RedirectInput[]): Promise<boolean> =>
    this.graphql
      .mutate<{ redirect: { saveMany: boolean } }, { routes: RedirectInput[] }>(
        {
          mutate: `
      mutation SaveMany($routes: [RedirectInput!]!) {
        redirect {
          saveMany(routes: $routes)
        }
      }
      `,
          variables: { routes },
        },
        {
          metric: 'rewriter-import-redirects',
        }
      )
      .then(res => res.data?.redirect?.saveMany) as Promise<boolean>

  public deleteRedirects = (paths: string[]): Promise<boolean> =>
    this.graphql
      .mutate<{ redirect: { deleteMany: boolean } }, { paths: string[] }>(
        {
          mutate: `
      mutation DeleteMany($paths: [String!]!) {
        redirect {
          deleteMany(paths: $paths)
        }
      }
      `,
          variables: { paths },
        },
        {
          metric: 'rewriter-delete-redirects',
        }
      )
      .then(res => res.data?.redirect?.deleteMany) as Promise<boolean>
}
