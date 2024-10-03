import { InfraClient, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

const routes = {
  Bucket: (bucket: string) => `${bucket}`,
  File: (bucket: string, path: string) => `buckets/${routes.Bucket(bucket)}/files/${path}`,
  Conflicts: (bucket: string) => `buckets/${routes.Bucket(bucket)}/conflicts`,
}

export class VBase extends InfraClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<VBase>(VBase, customContext, customOptions)
  }

  constructor(ctx: IOContext, opts?: InstanceOptions) {
    super('vbase@0.x', ctx, {
      ...opts,
      headers: {
        'X-Vtex-Detect-Conflicts': 'true',
        Authorization: ctx.authToken,
      },
    })
  }

  public resolveConflict = (bucketKey: string, path: string, content: any) => {
    const data = [
      {
        op: 'replace',
        path,
        value: content,
      },
    ]

    return this.http.patch(routes.Conflicts(`vtex.pages-graphql/${bucketKey}`), data, {
      metric: 'vbase-resolve-conflicts',
    })
  }

  public getConflicts = async () => {
    return this.http.get(routes.Conflicts('vtex.pages-graphql/userData'), {
      metric: 'vbase-get-conflicts',
    })
  }

  public checkForConflicts = async () => {
    let status: number
    try {
      const response = await this.http.get(routes.File('vtex.pages-graphql/userData', 'store/content.json'), {
        metric: 'vbase-conflict',
      })
      status = response.status
    } catch (error) {
      status = error.response && error.response.status
    }
    return status === 409
  }
}
