import logger from '../../logger'
import { AuthProviderBase, AuthProviders } from '../auth/AuthProviders'
import { Token } from '../auth/Token'
import { ErrorKinds } from '../error/ErrorKinds'
import { ErrorReport } from '../error/ErrorReport'
import { SessionsPersister, SessionsPersisterBase } from './SessionsPersister'

export interface LoginOptions {
  targetWorkspace?: string
  authMethod?: string
  useCachedToken?: boolean
}

export interface ISessionManager {
  account: string
  token: string
  tokenObj: Token
  workspace: string
  userLogged: string
  lastUsedAccount: string
  lastUsedWorkspace: string
  checkValidCredentials: () => boolean
  checkAndGetToken: (exitOnInvalid?: boolean) => string
  login: (newAccount: string, opts: LoginOptions) => Promise<void>
  logout: () => void
  workspaceSwitch: (newWorkspace: string) => void
}

interface SessionManagerArguments {
  sessionsPersister: SessionsPersisterBase
  authProviders: Record<string, AuthProviderBase>
}

interface SessionState {
  account: string
  tokenObj: Token
  workspace: string
  lastAccount: string
  lastWorkspace: string
}

export class SessionManager implements ISessionManager {
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
      this.saveState()
      return
    }

    // Tokens are scoped by workspace - logging into master will grant cacheability
    const { token } = await this.authProviders[authMethod].login(newAccount, 'master')
    this.state.account = newAccount
    this.state.workspace = targetWorkspace
    this.state.tokenObj = new Token(token)
    this.saveState()
    this.sessionPersister.saveAccountToken(newAccount, this.state.tokenObj.token)
  }

  public logout() {
    this.sessionPersister.clearData()
  }

  public checkValidCredentials(): boolean {
    return this.tokenObj.isValid() && !!this.state.account && !!this.state.workspace
  }

  public workspaceSwitch(newWorkspace: string) {
    if (this.state.workspace === newWorkspace) {
      return
    }

    this.state.lastWorkspace = this.state.workspace
    this.state.workspace = newWorkspace
    this.saveWorkspaceData()
  }

  /* This should not be used - implement another login method instead */
  public DEPRECATEDchangeAccount(account: string) {
    this.state.lastAccount = this.state.account
    this.state.account = account
    this.saveState()
  }

  /* This should not be used - implement another login method instead */
  public DEPRECATEDchangeToken(token: string) {
    this.state.tokenObj = new Token(token)
    this.saveState()
  }

  private saveState() {
    this.saveAccountData()
    this.saveWorkspaceData()
    this.sessionPersister.saveLogin(this.state.tokenObj.login)
    this.sessionPersister.saveToken(this.state.tokenObj.token)
  }

  private saveWorkspaceData() {
    this.sessionPersister.saveWorkspace(this.state.workspace)
    this.sessionPersister.saveLastWorkspace(this.state.lastWorkspace)
  }

  private saveAccountData() {
    this.sessionPersister.saveAccount(this.state.account)
    this.sessionPersister.saveLastAccount(this.state.lastAccount)
  }
}
