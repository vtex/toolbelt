import { AuthProviderBase, AuthProviders } from '../auth/AuthProviders'
import { Token } from '../auth/Token'
import { SessionsPersister, SessionsPersisterBase } from './SessionsPersister'
import { ErrorReport } from '../error/ErrorReport'
import { ErrorKinds } from '../error/ErrorKinds'
import logger from '../../logger'

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

    const sessionsPersister = SessionsPersister.getSingleton()
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

  get tokenObj() {
    return this.currToken
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

  public checkAndGetToken(exitOnInvalid = false) {
    if (this.currToken.isValid()) {
      return this.currToken.token
    }

    const errMsg = 'Auth token is invalid or expired.'

    if (exitOnInvalid) {
      logger.error(errMsg)
      process.exit(1)
    }

    throw ErrorReport.create({
      kind: ErrorKinds.INVALID_OR_EXPIRED_TOKEN_ERROR,
      originalError: new Error(errMsg),
    })
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
