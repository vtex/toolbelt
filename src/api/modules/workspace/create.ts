import { Workspaces } from '@vtex/api'
import chalk from 'chalk'
import { createFlowIssueError } from '../../error/utils'
import { ErrorReport } from '../../error/ErrorReport'
import { Builder } from '../../clients/IOClients/apps/Builder'
import { createWorkspacesClient } from '../../clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../session/SessionManager'
import { WorkspaceCreator } from '../../session/WorkspaceCreator'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import { ensureValidEdition } from './common/edition'
import { Messages } from '../../../lib/constants/Messages'

const VALID_WORKSPACE = /^[a-z][a-z0-9]{0,126}[a-z0-9]$/

const promptWorkspaceCreation = (name: string) => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return promptConfirm('Do you wish to create it?')
}

const warmUpRouteMap = async (workspace: string) => {
  try {
    const builder = Builder.createClient({ workspace })
    await builder.availability('vtex.builder-hub@0.x', null)
    log.debug('Warmed up route map')
  } catch (err) {} // eslint-disable-line no-empty
}

const promptWorkspaceProductionFlag = () => promptConfirm('Should the workspace be in production mode?', false)

const maybeLogWorkspaceAlreadyExists = (targetWorkspace: string, logIfAlreadyExists: boolean) => {
  if (!logIfAlreadyExists) {
    return
  }

  log.error(`Workspace '${targetWorkspace}' already exists.`)
}

export const handleErrorCreatingWorkspace = (targetWorkspace: string, err: Error | ErrorReport | any) => {
  log.error(`Failed to create workspace '${targetWorkspace}': ${err.message}`)
  const rep = ErrorReport.createAndMaybeRegisterOnTelemetry({ originalError: err })
  if (rep.shouldRemoteReport) {
    log.error(`ErrorID: ${rep.metadata.errorId}`)
  }
}

export const workspaceExists = async (account: string, workspace: string, workspacesClient: Workspaces) => {
  try {
    await workspacesClient.get(account, workspace)
    return true
  } catch (err) {
    if (err.response?.status === 404) {
      return false
    }

    throw err
  }
}

export const workspaceCreator: WorkspaceCreator = async ({
  targetWorkspace,
  clientContext,
  productionWorkspace,
  promptCreation,
  logIfAlreadyExists = true,
}) => {
  if (!VALID_WORKSPACE.test(targetWorkspace)) {
    throw createFlowIssueError(
      "Whoops! That's not a valid workspace name. Please use only lowercase letters and numbers."
    )
  }

  const { account, workspace, token } = clientContext ?? SessionManager.getSingleton()
  const workspaces = createWorkspacesClient({ workspace, account, authToken: token })

  if (await workspaceExists(account, targetWorkspace, workspaces)) {
    maybeLogWorkspaceAlreadyExists(targetWorkspace, logIfAlreadyExists)
    return 'exists'
  }

  if (promptCreation && !(await promptWorkspaceCreation(targetWorkspace))) {
    return 'cancelled'
  }

  if (productionWorkspace == null) {
    productionWorkspace = await promptWorkspaceProductionFlag()
  }

  log.debug('Creating workspace', targetWorkspace)

  try {
    await workspaces.create(account, targetWorkspace, productionWorkspace)

    log.info(
      `Workspace ${chalk.green(targetWorkspace)} created ${chalk.green('successfully')} with ${chalk.green(
        `production=${productionWorkspace}`
      )}`
    )

    await ensureValidEdition(targetWorkspace)

    // First request on a brand new workspace takes very long because of route map generation, so we warm it up.
    warmUpRouteMap(targetWorkspace)

    return 'created'
  } catch (err) {
    if (err.response?.data.code === 'ArgumentNull') {
      throw createFlowIssueError(Messages.CREATE_MISSING_WORKSPACE_NAME())
    }

    if (err.response?.data.code === 'WorkspaceAlreadyExists') {
      maybeLogWorkspaceAlreadyExists(targetWorkspace, logIfAlreadyExists)
      return
    }

    throw err
  }
}
