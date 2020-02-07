import { AuthProviderBase, AuthProviders } from '../auth/AuthProviders'
import { Token } from '../auth/Token'
import { SessionsPersister, SessionsPersisterBase } from './SessionsPersister'

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

  private curAccount: string
  private curToken: Token
  private curWorkspace: string

  private sessionPersister: SessionManagerArguments['sessionsPersister']
  private authProviders: SessionManagerArguments['authProviders']

  constructor({ sessionsPersister, authProviders }: SessionManagerArguments) {
    this.sessionPersister = sessionsPersister
    this.authProviders = authProviders
  }

  get account() {
    return this.curAccount
  }

  get token() {
    return this.curToken.token
  }

  get workspace() {
    return this.curWorkspace
  }

  get userLogged() {
    return this.curToken.login
  }

  public async login(
    newAccount: string,
    { targetWorkspace = 'master', authMethod = 'oauth', useCachedToken = true }: LoginOptions
  ) {
    const currentToken = new Token(this.sessionPersister.getAccountToken(newAccount))
    if (useCachedToken && currentToken.isValid()) {
      this.curAccount = newAccount
      this.curWorkspace = targetWorkspace
      this.curToken = currentToken
      return
    }

    const { token, login } = await this.authProviders[authMethod].login(newAccount, targetWorkspace)
    this.sessionPersister.saveAccount(newAccount)
    this.sessionPersister.saveWorkspace(targetWorkspace)
    this.sessionPersister.saveLogin(login)
    this.sessionPersister.saveToken(token)
    this.sessionPersister.saveAccountToken(newAccount, token)
    this.curAccount = newAccount
    this.curWorkspace = targetWorkspace
    this.curToken = new Token(token)
  }

  public logout() {
    this.sessionPersister.clearData()
  }

  public switchWorkspace(newWorkspace: string) {
    this.curWorkspace = newWorkspace
  }
}
