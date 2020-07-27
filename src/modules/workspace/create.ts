import { Workspaces } from '@vtex/api'
import chalk from 'chalk'
import { ErrorKinds, ErrorReport } from '../../api/error'
import { Builder } from '../../api/clients/IOClients/apps/Builder'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import { WorkspaceCreator } from '../../api/session/WorkspaceCreator'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { ensureValidEdition } from './common/edition'

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
    throw ErrorReport.createAndMaybeRegisterOnTelemetry({
      kind: ErrorKinds.FLOW_ISSUE_ERROR,
      originalError: new Error(
        "Whoops! That's not a valid workspace name. Please use only lowercase letters and numbers."
      ),
    })
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
    if (err.response?.data.code === 'WorkspaceAlreadyExists') {
      maybeLogWorkspaceAlreadyExists(targetWorkspace, logIfAlreadyExists)
      return
    }

    throw err
  }
}
