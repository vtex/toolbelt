import chalk from 'chalk'
import { CommandError } from '../../errors'
import { EvolutionManager } from '../../lib/clients/IOClients/apps/EvolutionManager'
import { createWorkspacesClient } from '../../lib/clients/IOClients/infra/Workspaces'
import { ErrorKinds } from '../../lib/error/ErrorKinds'
import { ErrorReport } from '../../lib/error/ErrorReport'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import useCmd from './use'

const { promote, get } = createWorkspacesClient()
const { account, workspace: currentWorkspace } = SessionManager.getSingleton()

const throwIfIsMaster = (workspace: string) => {
  if (workspace === 'master') {
    throw new CommandError(`It is not possible to promote workspace ${workspace} to master`)
  }
}

const isPromotable = async (workspace: string) => {
  throwIfIsMaster(workspace)
  const meta = await get(account, currentWorkspace)
  if (!meta.production) {
    throw new CommandError(
      `Workspace ${chalk.green(currentWorkspace)} is not a ${chalk.green(
        'production'
      )} workspace\nOnly production workspaces may be promoted\nUse the command ${chalk.blue(
        'vtex workspace create <workspace> --production'
      )} to create a production workspace`
    )
  }
}
const promptPromoteConfirm = (workspace: string): Promise<boolean> =>
  promptConfirm(`Are you sure you want to promote workspace ${chalk.green(workspace)} to master?`, true)

export default async () => {
  log.debug('Promoting workspace', currentWorkspace)
  await isPromotable(currentWorkspace)
  const promptAnswer = await promptPromoteConfirm(currentWorkspace)
  if (!promptAnswer) {
    return
  }
  await promote(account, currentWorkspace)

  const sessionManager = SessionManager.getSingleton()
  const userEmail = sessionManager.userLogged

  const evolutionManager = EvolutionManager.createClient()
  try {
    await evolutionManager.saveWorkspacePromotion(userEmail, currentWorkspace)
  } catch (err) {
    log.error('Failed to report workspace promotion to Evolution Manager')
    ErrorReport.createAndRegisterOnTelemetry({
      originalError: err,
      kind: ErrorKinds.EVOLUTION_MANAGER_REPORT_ERROR,
    })
  }

  log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`)
  await useCmd('master')
}
