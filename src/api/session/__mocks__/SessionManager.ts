import { Token } from '../../../lib/auth/Token'
import { ISessionManager, LoginInput, WorkspaceSwitchInput, WorkspaceSwitchResult } from '../SessionManager'

export class SessionManagerMock implements ISessionManager {
  private static singleton: SessionManagerMock

  public static getSingleton(): SessionManagerMock {
    if (SessionManagerMock.singleton) {
      return SessionManagerMock.singleton
    }

    SessionManagerMock.singleton = new SessionManagerMock()
    return SessionManagerMock.singleton
  }

  public account: string
  public token: string
  public tokenObj: Token
  public workspace: string
  public userLogged: string
  public lastUsedAccount: string
  public lastUsedWorkspace: string

  constructor() {
    this.account = 'currAccount'
    this.token = 'mockToken'
    this.tokenObj = new Token('mockToken')
    this.workspace = 'currWorkspace'
    this.userLogged = 'user.logged'
    this.lastUsedAccount = 'prevAccount'
    this.lastUsedWorkspace = 'prevWorkspace'
  }

  public checkValidCredentials() {
    return true
  }

  public checkAndGetToken() {
    return this.token
  }

  public login(newAccount: string, { targetWorkspace = 'master' }: LoginInput) {
    this.account = newAccount
    this.workspace = targetWorkspace
    return Promise.resolve()
  }

  public async logout() {}

  public async workspaceSwitch({ targetWorkspace }: WorkspaceSwitchInput): Promise<WorkspaceSwitchResult> {
    this.workspace = targetWorkspace
    return 'exists'
  }
}

export const SessionManager = {
  getSingleton: () => SessionManagerMock.getSingleton(),
}
