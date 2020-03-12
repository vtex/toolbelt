import { AppGraphQLClient, InstanceOptions, IOContext } from '@vtex/api'
import { path } from 'ramda'

export interface RouteIndexFiles {
  lastChangeDate: string
  routeIndexFiles: RouteIndexFileEntry[]
}

export interface RouteIndexFileEntry {
  fileName: string
  fileSize: string
}

export interface RouteIndexEntry {
  id: string
  lastChangeDate: string
}

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

export interface ExportResponse {
  routes: Redirect[]
  next: string
}

export class Rewriter extends AppGraphQLClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter@1.x', context, {
      ...options,
      headers: { ...options.headers, 'cache-control': 'no-cache' },
      retries: 5,
      timeout: 10000,
    })
  }

  public routesIndexFiles = (): Promise<RouteIndexFiles> =>
    this.graphql
      .query<string[], {}>(
        {
          query: `
      query RoutesIndexFiles {
        redirect {
          indexFiles {
            lastChangeDate
            routeIndexFiles {
              fileName
              fileSize
            }
          }
        }
      }
      `,
          variables: {},
        },
        {
          metric: 'rewriter-get-redirects-index-files',
        }
      )
      .then(path(['data', 'redirect', 'indexFiles'])) as Promise<RouteIndexFiles>

  public routesIndex = (fileName: string): Promise<RouteIndexEntry[]> =>
    this.graphql
      .query<string[], { fileName: string }>(
        {
          query: `
      query RoutesIndex($fileName: String!) {
        redirect {
          index(fileName: $fileName) {
            id
            lastChangeDate
          }
        }
      }
      `,
          variables: { fileName },
        },
        {
          metric: 'rewriter-get-redirects-index',
        }
      )
      .then(path(['data', 'redirect', 'index'])) as Promise<RouteIndexEntry[]>

  public exportRedirects = (next?: string): Promise<ExportResponse> =>
    this.graphql
      .query<ExportResponse, { next: string }>(
        {
          query: `
      query ListRedirects($next: String) {
        redirect {
          listRedirects(next: $next) {
            next
            routes {
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
      .then(path(['data', 'redirect', 'listRedirects'])) as Promise<ExportResponse>

  public importRedirects = (routes: RedirectInput[]): Promise<boolean> =>
    this.graphql
      .mutate<boolean, { routes: RedirectInput[] }>(
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
      .then(path(['data', 'redirect', 'saveMany'])) as Promise<boolean>

  public deleteRedirects = (paths: string[]): Promise<boolean> =>
    this.graphql
      .mutate<boolean, { paths: string[] }>(
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
      .then(path(['data', 'redirect', 'deleteMany'])) as Promise<boolean>
}
