
import { SessionsPersister, SessionsPersisterBase } from './SessionsPersister'
import { AuthProviderBase, AuthProviders } from '../AuthProviders'
import { Token } from '../../lib/local/Token'

interface SessionManagerArguments {
  sessionsPersister: SessionsPersisterBase
  authProviders: Record<string, AuthProviderBase>
}

interface LoginOptions {
  targetWorkspace?: string
  authMethod?: string
  useCachedToken?: boolean
}

export class SessionManager {
  private static sessionManagerSingleton: SessionManager = null

  public static getSessionManager(): SessionManager {
    if (SessionManager.sessionManagerSingleton) {
      return SessionManager.sessionManagerSingleton
    }

    const sessionsPersister = SessionsPersister.getSessionsPersister()
    const authProviders = AuthProviders.getAuthProviders()
    SessionManager.sessionManagerSingleton = new SessionManager({ sessionsPersister, authProviders })
    return SessionManager.sessionManagerSingleton
  }

  private currAccount: string

  private currToken: Token

  private currWorkspace: string

  private sessionPersister: SessionManagerArguments['sessionsPersister']

  private authProviders: SessionManagerArguments['authProviders']

  constructor({ sessionsPersister, authProviders }: SessionManagerArguments) {
    this.sessionPersister = sessionsPersister
    this.authProviders = authProviders
    this.currAccount = this.sessionPersister.getAccount()
    this.currWorkspace = this.sessionPersister.getWorkspace()
    this.currToken = new Token(this.sessionPersister.getToken())
  }

  get account() {
    return this.currAccount
  }

  get token() {
    return this.currToken.token
  }

  get workspace() {
    return this.currWorkspace
  }

  get userLogged() {
    return this.currToken.login
  }

  private saveCredentials() {
    this.sessionPersister.saveAccount(this.account)
    this.sessionPersister.saveWorkspace(this.workspace)
    this.sessionPersister.saveLogin(this.currToken.login)
    this.sessionPersister.saveToken(this.currToken.token)
  }

  public async login(
    newAccount: string,
    { targetWorkspace = 'master', authMethod = 'oauth', useCachedToken = true }: LoginOptions
  ) {
    const currentToken = new Token(this.sessionPersister.getAccountToken(newAccount))
    if (useCachedToken && currentToken.isValid()) {
      this.currAccount = newAccount
      this.currWorkspace = targetWorkspace
      this.currToken = currentToken
      this.saveCredentials()
      return
    }

    const { token } = await this.authProviders[authMethod].login(newAccount, targetWorkspace)
    this.currAccount = newAccount
    this.currWorkspace = targetWorkspace
    this.currToken = new Token(token)
    this.saveCredentials()
    this.sessionPersister.saveAccountToken(newAccount, this.currToken.token)
  }

  public logout() {
    this.sessionPersister.clearData()
  }

  public switchWorkspace(newWorkspace: string) {
    this.currWorkspace = newWorkspace
    this.sessionPersister.saveWorkspace(this.currWorkspace)
  }
}
