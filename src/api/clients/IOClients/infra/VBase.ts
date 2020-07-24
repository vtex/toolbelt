import { InfraClient, InstanceOptions, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

const routes = {
    Bucket: (bucket: string) => `/buckets/${bucket}`,
    File: (bucket: string, path: string) => `${routes.Bucket(bucket)}/userData/files/${path}`,
};

export class VBase extends InfraClient {
    public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
        return IOClientFactory.createClient<VBase>(VBase, customContext, customOptions)
    }

    constructor(ctx: IOContext, opts?: InstanceOptions) {
        super('vbase@0.x', ctx, {
            ...opts,
            headers: {
                'X-Vtex-Detect-Conflicts': 'true',
                'Authorization': ctx.authToken
            },
        })
    }

    public checkForConflicts = async () => {
        let status: number
        try {
            const response = await this.http.get(routes.File('vtex.pages-graphql', 'store/content.json'), { metric: 'vbase-conflict' })
            status = response.status
        } catch (error) {
            status = error.response && error.response.status
        }
        return status === 409
    }

}