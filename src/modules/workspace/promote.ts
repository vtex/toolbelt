import chalk from 'chalk'
import { CommandError } from '../../api/error/errors'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
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
  log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`)
  await useCmd('master')
}
