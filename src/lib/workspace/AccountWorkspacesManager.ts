import { Workspaces } from '@vtex/api'
import { clientsCreator } from '../clients'
import { SessionManager } from '../session/SessionManager'
import { ErrorReport } from '../ErrorReport/ErrorReport'
import { ErrorCodes } from '../ErrorReport/errorCodes'
import { Builder } from '../../clients/Builder'

interface AccountWorkspacesManagerArguments {
  account: string
  workspacesClient: Workspaces
  logger: any
}

export class AccountWorkspacesManager {
  private static readonly VALID_WORKSPACE_REGEX = /^[a-z][a-z0-9]{0,126}[a-z0-9]$/
  private static singletonInstance: AccountWorkspacesManager = null

  public static getAccountWorkspacesManager() {
    if (AccountWorkspacesManager.singletonInstance) {
      return AccountWorkspacesManager.singletonInstance
    }

    const sessionManager = SessionManager.getSessionManager()
    const { account, token: authToken, workspace } = sessionManager
    const workspacesClient = clientsCreator.createWorkspaceClient({ account, authToken, workspace })
    AccountWorkspacesManager.singletonInstance = new AccountWorkspacesManager({ account, workspacesClient })
    return AccountWorkspacesManager.singletonInstance
  }

  private readonly account: string
  private readonly workspacesClient: Workspaces
  private readonly logger: any
  constructor({ account, workspacesClient, logger }: AccountWorkspacesManagerArguments) {
    this.account = account
    this.workspacesClient = workspacesClient
    this.logger = logger
  }

  public async warmUpWorkspaceRouteMap(workspaceName: string) {
    try {
      const sessionManager = SessionManager.getSessionManager()
      const {  } = sessionManager
      const builderHubClient = 
      await builderHubClient.availability('vtex.builder-hub@0.x', null)
      this.logger.debug('Warmed up route map')
    } catch (err) {
      this.logger.debug(err)
    }
  }
  public async createWorkspace(workspaceName: string, production: boolean) {
    if (!AccountWorkspacesManager.VALID_WORKSPACE_REGEX.test(workspaceName)) {
      throw new ErrorReport({
        code: ErrorCodes.INVALID_WORKSPACE_NAME,
        message: `"${workspaceName}" is not a valid workspace name. Only lowercase letters and numbers are allowed.`,
      })
    }

    try {
      await this.workspacesClient.create(this.account, workspaceName, production)
      await warmUpRouteMap(name)
    } catch (err) {
      if (err.response && err.response.data.code === 'WorkspaceAlreadyExists') {
        log.error(err.response.data.message)
        return
      }
      throw err
    }
  }

  public deleteWorkspace() {}
}
