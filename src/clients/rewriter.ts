import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

export interface RedirectInput {
  id: string
  from: string
  to: string
  endDate: string
  type: RedirectTypes
  bindings: string[] | null
}

export enum RedirectTypes {
  PERMANENT = 'permanent',
  TEMPORARY = 'temporary',
}

const routes = {
  importRoutes: `/importroutes`,
  exportRoutes: '/exportroutes',
  routesIndex: '/routesindex',
}

export class Rewriter extends AppClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter', context, options)
  }

  public importRedirects = (redirects: RedirectInput[]) =>
    this.http.post(routes.importRoutes, { data: redirects }, { metric: 'rewriter-import-redirects' })

  public exportRedirects = (from: number, to: number) =>
    this.http.post(routes.exportRoutes, { data: { from, to } }, { metric: 'rewriter-export-redirects' })

  public routesIndex = () =>
    this.http.get(routes.routesIndex, { metric: 'rewriter-routes-index' })
}
