import { AppManifest, AuthType, InstanceOptions, IOClient, IOContext } from '@vtex/api'
import { IOClientFactory } from '../IOClientFactory'

export interface EditionInfo extends AppManifest {
  id: string
  title: string
  _publicationDate: string
  _activationDate: string
}

export class Sponsor extends IOClient {
  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<Sponsor>(Sponsor, customContext, customOptions)
  }

  private account: string
  private workspace: string

  constructor(context: IOContext, options: InstanceOptions) {
    super(context, {
      ...options,
      authType: AuthType.bearer,
    })
    const { account, workspace } = context
    this.account = account
    this.workspace = workspace
  }

  public async getSponsorAccount() {
    const res = await this.http.get(this.routes.getSponsorAccount, { metric: 'get-sponsor-account' })
    return res?.sponsorAccount as string
  }

  public getEdition() {
    return this.http.get<EditionInfo>(this.routes.getEdition, { metric: 'get-edition' })
  }

  public setEdition(account: string, workspace: string, editionApp: string) {
    const [edition, version] = editionApp.split('@')
    const [sponsor, editionName] = edition.split('.')
    return this.http.post(
      this.routes.setEdition(account, workspace),
      { sponsor, edition: editionName, version },
      { metric: 'set-edition' }
    )
  }

  private get routes() {
    return {
      getSponsorAccount: `https://platform.io.vtex.com/_account/${this.account}`,
      getEdition: `https://infra.io.vtex.com/apps/v0/${this.account}/${this.workspace}/edition`,
      setEdition: (account: string, workspace: string) =>
        `https://app.io.vtex.com/vtex.tenant-provisioner/v0/${this.account}/master/tenants/${account}/migrate?tenantWorkspace=${workspace}`,
    }
  }
}
