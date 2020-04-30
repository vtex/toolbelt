import logger from '../../logger'
import { AuthProviderBase, AuthProviders } from '../auth/AuthProviders'
import { Token } from '../auth/Token'
import { ErrorKinds } from '../error/ErrorKinds'
import { ErrorReport } from '../error/ErrorReport'
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

interface SessionState {
  account: string
  tokenObj: Token
  workspace: string
  lastAccount: string
  lastWorkspace: string
}

export class SessionManager {
  private static singleton: SessionManager

  public static getSingleton(): SessionManager {
    if (SessionManager.singleton) {
      return SessionManager.singleton
    }

    const sessionsPersister = SessionsPersister.getSingleton()
    const authProviders = AuthProviders.getAuthProviders()
    SessionManager.singleton = new SessionManager({ sessionsPersister, authProviders })
    return SessionManager.singleton
  }

  private state: SessionState

  private sessionPersister: SessionManagerArguments['sessionsPersister']
  private authProviders: SessionManagerArguments['authProviders']

  constructor({ sessionsPersister, authProviders }: SessionManagerArguments) {
    this.sessionPersister = sessionsPersister
    this.authProviders = authProviders
    this.state = {
      account: this.sessionPersister.getAccount(),
      lastAccount: this.sessionPersister.getLastAccount(),
      workspace: this.sessionPersister.getWorkspace(),
      lastWorkspace: this.sessionPersister.getLastWorkspace(),
      tokenObj: new Token(this.sessionPersister.getToken()),
    }
  }

  get account() {
    return this.state.account
  }

  get token() {
    return this.state.tokenObj.token
  }

  get tokenObj() {
    return this.state.tokenObj
  }

  get workspace() {
    return this.state.workspace
  }

  get userLogged() {
    return this.state.tokenObj.login
  }

  get lastUsedAccount() {
    return this.state.lastAccount
  }

  get lastUsedWorkspace() {
    return this.state.lastWorkspace
  }

  public checkAndGetToken(exitOnInvalid = false) {
    if (this.state.tokenObj.isValid()) {
      return this.state.tokenObj.token
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
    if (this.account !== newAccount) {
      this.state.lastAccount = this.account
      this.state.lastWorkspace = null
    }

    const cachedToken = new Token(this.sessionPersister.getAccountToken(newAccount))
    if (useCachedToken && cachedToken.isValid()) {
      this.state.account = newAccount
      this.state.workspace = targetWorkspace
      this.state.tokenObj = cachedToken
      this.flushState()
      return
    }

    // Tokens are scoped by workspace - logging into master will grant cacheability
    const { token } = await this.authProviders[authMethod].login(newAccount, 'master')
    this.state.account = newAccount
    this.state.workspace = targetWorkspace
    this.state.tokenObj = new Token(token)
    this.flushState()
    this.sessionPersister.saveAccountToken(newAccount, this.state.tokenObj.token)
  }

  public logout() {
    this.sessionPersister.clearData()
  }

  public workspaceSwitch(newWorkspace: string) {
    if (this.state.workspace === newWorkspace) {
      return
    }

    this.state.lastWorkspace = this.state.workspace
    this.state.workspace = newWorkspace
    this.flushWorkspaceData()
  }

  /* This should not be used - implement another login method instead */
  public DEPRECATEDchangeAccount(account: string) {
    this.state.lastAccount = this.state.account
    this.state.account = account
    this.flushState()
  }

  /* This should not be used - implement another login method instead */
  public DEPRECATEDchangeToken(token: string) {
    this.state.tokenObj = new Token(token)
    this.flushState()
  }

  private flushState() {
    this.flushAccountData()
    this.flushWorkspaceData()
    this.sessionPersister.saveLogin(this.state.tokenObj.login)
    this.sessionPersister.saveToken(this.state.tokenObj.token)
  }

  private flushWorkspaceData() {
    this.sessionPersister.saveWorkspace(this.state.workspace)
    this.sessionPersister.saveLastWorkspace(this.state.lastWorkspace)
  }

  private flushAccountData() {
    this.sessionPersister.saveAccount(this.state.account)
    this.sessionPersister.saveLastAccount(this.state.lastAccount)
  }
}
