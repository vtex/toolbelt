import { AuthProviderBase, AuthProviders } from '../../lib/auth/AuthProviders'
import { ApiTokenAuthenticator } from '../../lib/auth/AuthProviders/ApiTokenAuthenticator'
import { Token } from '../../lib/auth/Token'
import { VTEXID } from '../clients/IOClients/external/VTEXID'
import { ErrorKinds } from '../error/ErrorKinds'
import { ErrorReport } from '../error/ErrorReport'
import logger from '../logger'
import { SessionsPersister, SessionsPersisterBase } from './SessionsPersister'
import { WorkspaceCreateResult, WorkspaceCreator } from './WorkspaceCreator'

interface WorkspaceCreation {
  production?: boolean
  promptCreation: boolean
  creator: WorkspaceCreator
  onError: (targetWorkspace: string, err: Error | any) => void
}

export interface LoginInput {
  targetWorkspace?: string
  authMethod?: string
  useCachedToken?: boolean
  workspaceCreation: WorkspaceCreation
}


export interface PipelineLoginInput {
  vtexApiKey?: string
  vtexApiToken?: string
  targetWorkspace: string
  workspaceCreation: WorkspaceCreation
}

export interface WorkspaceSwitchInput {
  targetWorkspace: string
  workspaceCreation: WorkspaceCreation
}

interface WorkspaceSwitchMasterInput {
  targetWorkspace: 'master'
}

export type WorkspaceSwitchResult = WorkspaceCreateResult | 'not-changed'

function isWorkspaceSwitchMaster(
  el: WorkspaceSwitchInput | WorkspaceSwitchMasterInput
): el is WorkspaceSwitchMasterInput {
  return el.targetWorkspace === 'master'
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
  login: (newAccount: string, opts: LoginInput) => Promise<void>
  logout: (logoutOptions?: LogoutOptions) => Promise<void>
  workspaceSwitch: (input: WorkspaceSwitchInput) => Promise<WorkspaceSwitchResult>
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

interface LogoutOptions {
  /**
   * Open browser on URL to invalidate browser's auth cookie on the current account
   * @default false
   */
  invalidateBrowserAuthCookie: boolean
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


  public async loginUsingPipeline(newAccount: string, { 
    vtexApiKey,
    targetWorkspace = 'master',
    workspaceCreation,
    vtexApiToken
  }: PipelineLoginInput) {
    if (this.account !== newAccount) {
      this.state.lastAccount = this.account
      this.state.lastWorkspace = null
    }

    const cachedToken = new Token(this.sessionPersister.getAccountToken(newAccount))

    if (cachedToken.isValid()) {
      this.state.tokenObj = cachedToken
    } else {
      const apiToken = new ApiTokenAuthenticator()
      const token = await apiToken.login(vtexApiKey, vtexApiToken, newAccount)
      this.state.tokenObj = new Token(token)
      this.sessionPersister.saveAccountToken(newAccount, this.state.tokenObj.token)
    }


    this.state.account = newAccount
    this.state.workspace = 'master'
    this.saveState()
    await this.workspaceSwitch({ targetWorkspace, workspaceCreation })
  }


  public async login(
    newAccount: string,
    { targetWorkspace = 'master', authMethod = 'oauth', useCachedToken = true, workspaceCreation }: LoginInput
  ) {
    if (this.account !== newAccount) {
      this.state.lastAccount = this.account
      this.state.lastWorkspace = null
    }

    const cachedToken = new Token(this.sessionPersister.getAccountToken(newAccount))
    if (useCachedToken && cachedToken.isValid()) {
      this.state.tokenObj = cachedToken
    } else {
      // Tokens are scoped by workspace - logging into master will grant cacheability
      const { token } = await this.authProviders[authMethod].login(newAccount, 'master')
      this.state.tokenObj = new Token(token)
      this.sessionPersister.saveAccountToken(newAccount, this.state.tokenObj.token)
    }

    this.state.account = newAccount
    this.state.workspace = 'master'
    this.saveState()
    await this.workspaceSwitch({ targetWorkspace, workspaceCreation })
  }

  public async logout(logoutOptions?: LogoutOptions) {
    const opts: LogoutOptions = { invalidateBrowserAuthCookie: false, ...logoutOptions }
    if (this.token) {
      await this.invalidateTokens(opts)
    }

    this.sessionPersister.clearData()
  }

  public checkValidCredentials(): boolean {
    return this.tokenObj.isValid() && !!this.state.account && !!this.state.workspace
  }

  public async workspaceSwitch(
    input: WorkspaceSwitchInput | WorkspaceSwitchMasterInput
  ): Promise<WorkspaceSwitchResult> {
    const { targetWorkspace } = input
    if (this.state.workspace === targetWorkspace) {
      return 'not-changed'
    }

    let result: WorkspaceCreateResult
    if (!isWorkspaceSwitchMaster(input)) {
      try {
        result = await input.workspaceCreation.creator({
          targetWorkspace,
          productionWorkspace: input.workspaceCreation.production,
          promptCreation: input.workspaceCreation.promptCreation,
          logIfAlreadyExists: false,
          clientContext: {
            account: this.account,
            token: this.token,
            workspace: this.workspace,
          },
        })
      } catch (err) {
        input.workspaceCreation.onError(targetWorkspace, err)
        result = 'error'
      }
    } else {
      result = 'exists'
    }

    if (result === 'created' || result === 'exists') {
      this.state.lastWorkspace = this.state.workspace
      this.state.workspace = targetWorkspace
      this.saveWorkspaceData()
    }

    return result
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

  private async invalidateTokens({ invalidateBrowserAuthCookie }: LogoutOptions) {
    const vtexId = VTEXID.createClient()
    try {
      await vtexId.invalidateToolbeltToken(this.token)
      logger.info('Invalidated local token')
    } catch (err) {
      const errReport = ErrorReport.createAndMaybeRegisterOnTelemetry({ originalError: err })
      logger.error('Unable to invalidate local token')
      errReport.logErrorForUser({
        coreLogLevelDefault: 'debug',
        logLevels: { core: { errorMessage: 'error', errorId: 'error' } },
      })
      return
    }

    if (invalidateBrowserAuthCookie && this.account) {
      VTEXID.invalidateBrowserAuthCookie(this.account)
    }
  }
}
