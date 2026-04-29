export interface LoginResult {
  login: string
  token: string
  refreshToken?: string
}

export abstract class AuthProviderBase {
  public abstract login(account: string, workspace: string): Promise<LoginResult>
}
