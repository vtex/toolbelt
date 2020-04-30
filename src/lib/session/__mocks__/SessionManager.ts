import { Token } from '../../auth/Token'
import { ISessionManager, LoginOptions } from '../SessionManager'

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

  public login(newAccount: string, { targetWorkspace = 'master' }: LoginOptions) {
    this.account = newAccount
    this.workspace = targetWorkspace
    return Promise.resolve()
  }

  public logout() {}

  public workspaceSwitch(newWorkspace: string) {
    this.workspace = newWorkspace
  }
}

export const SessionManager = {
  getSingleton: () => SessionManagerMock.getSingleton(),
}
