import { AuthType, InstanceOptions, IOClient, IOContext } from '@vtex/api'

export class Sponsor extends IOClient {
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

  public getSponsorAccount = async () => this.http.get(this.routes.getSponsorAccount, { metric: 'get-sponsor-account' })

  public getEdition = async () => this.http.get(this.routes.getEdition, { metric: 'get-edition' })

  public setEdition = async (account: string, workspace: string, editionApp: string) => {
    const [edition, version] = editionApp.split('@')
    const [sponsor, editionName] = edition.split('.')
    return this.http.post(
      this.routes.setEdition(account, workspace),
      { sponsor, edition: editionName, version },
      { metric: 'set-edition' }
    )
  }

  public runHouseKeeper = async () => this.http.post(this.routes.runHouseKeeper, {}, { metric: 'run-house-keeper' })

  private get routes() {
    return {
      getSponsorAccount: `https://platform.io.vtex.com/_account/${this.account}`,
      getEdition: `https://infra.io.vtex.com/apps/v0/${this.account}/${this.workspace}/edition`,
      setEdition: (account: string, workspace: string) =>
        `https://app.io.vtex.com/vtex.tenant-provisioner/v0/${this.account}/master/tenants/${account}/migrate?tenantWorkspace=${workspace}`,
      runHouseKeeper: `https://infra.io.vtex.com/housekeeper/v0/${this.account}/master/_housekeeping/perform`,
    }
  }
}
