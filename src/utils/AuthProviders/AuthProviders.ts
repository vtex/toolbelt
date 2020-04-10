import { AuthProviderBase } from './AuthProviderBase'
import { OAuthAuthenticator } from './OAuthAuthenticator'

export class AuthProviders {
  public static getAuthProviders(): Record<string, AuthProviderBase> {
    return {
      [OAuthAuthenticator.AUTH_TYPE]: new OAuthAuthenticator(),
    }
  }
}
