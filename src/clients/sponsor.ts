import { AuthType, InstanceOptions, IOClient, IOContext } from '@vtex/api'

export class Sponsor extends IOClient {

  private region: string
  private account: string
  private workspace: string

  constructor(context: IOContext, options: InstanceOptions) {
    super(
      context,
      {
        ...options,
        authType: AuthType.bearer,
      }
    )
    const { region, account, workspace } = context
    this.region = region
    this.account = account
    this.workspace = workspace
  }

  public getSponsorAccount = async () =>
    this.http.get(this.routes.getSponsorAccount, { metric: 'get-sponsor-account' })

  public getEdition = async () =>
    this.http.get(this.routes.getEdition, { metric: 'get-edition' })

  public setEdition = async (account: string, edition: string) =>
    this.http.post(this.routes.setEdition(account), { edition }, { metric: 'set-edition' })

  public runHouseKeeper = async () =>
    this.http.post(this.routes.runHouseKeeper, {}, { metric: 'run-house-keeper' })

  private get routes() {
    return {
      getSponsorAccount: `kube-router.${this.region}.vtex.io/_accounts/${this.account}`,
      getEdition: `apps.${this.region}.vtex.io/${this.account}/${this.workspace}/edition`,
      setEdition: (account: string) =>
      `apps.${this.region}.vtex.io/${this.account}/master/childAccount/${account}/edition`,
      runHouseKeeper: `housekeeper.${this.region}.vtex.io/${this.account}/master/_housekeeping/perform`,
    }
  }

}
