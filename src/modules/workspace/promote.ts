import chalk from 'chalk'
import { createFlowIssueError } from '../../api/error/utils'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { VBase } from '../../api/clients/IOClients/infra/VBase'
import authUrl from '../url'
import useCmd from './use'

const { checkForConflicts } = VBase.createClient()
const { promote, get } = createWorkspacesClient()
const { account, workspace: currentWorkspace } = SessionManager.getSingleton()

const throwIfIsMaster = (workspace: string) => {
  if (workspace === 'master') {
    throw createFlowIssueError(`It is not possible to promote workspace ${workspace} to master`)
  }
}

const isPromotable = async (workspace: string) => {
  throwIfIsMaster(workspace)
  const conflictsFound = await checkForConflicts()
  if (conflictsFound) {
    throw new CommandError(`
    Workspace ${chalk.green(currentWorkspace)} have changes that can cause conflict with the ${chalk.green('master')}.
    Please, take a look at this workspace.\n
    See at: ${authUrl()}\n
    After comparing the workspaces, run ${chalk.magenta('vtex workspace promote')}.\n`)
  }
  const meta = await get(account, currentWorkspace)
  if (!meta.production) {
    throw createFlowIssueError(
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
  log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`)
  await useCmd('master')
}
