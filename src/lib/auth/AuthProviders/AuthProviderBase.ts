export interface LoginResult {
  login: string
  token: string
}

export abstract class AuthProviderBase {
  public abstract async login(account: string, workspace: string, logAuthUrl: boolean): Promise<LoginResult>
}
