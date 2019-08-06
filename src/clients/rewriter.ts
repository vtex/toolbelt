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
}

export class Rewriter extends AppClient {
  constructor(context: IOContext, options: InstanceOptions) {
    super('vtex.rewriter', context, options)
  }

  // Abort AB Test in a workspace.
  public importRedirects = async (redirects: RedirectInput[]) =>
    this.http.post(routes.importRoutes, { data: redirects }, { metric: 'rewriter-import-redirects' })

  // Start AB Test in a workspace with a given probability.
  public exportRedirects = async () =>
    this.http.get(routes.exportRoutes, { metric: 'rewriter-export-redirects' })
}
