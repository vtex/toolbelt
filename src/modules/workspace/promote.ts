import chalk from 'chalk'
import axios from 'axios'
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
const url = authUrl()

const throwIfIsMaster = (workspace: string) => {
  if (workspace === 'master') {
    throw createFlowIssueError(`It is not possible to promote workspace ${workspace} to master`)
  }
}

const isPromotable = async (workspace: string) => {
  console.log('Preparing the workspace to be promoted\n')
  throwIfIsMaster(workspace)
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
  const conflictsFound = await checkForConflicts()
  if (conflictsFound) {
    await axios.get(url)
  }
}
const promptPromoteConfirm = (workspace: string): Promise<boolean> =>
  promptConfirm(
    `Do you want to promote ${chalk.green(workspace)} to master? ${chalk.dim(
      `Doing so, the work you did locally will be taken to production.`
    )}`,
    true
  )

export default async () => {
  log.debug('Promoting workspace', currentWorkspace)
  await isPromotable(currentWorkspace)
  console.log(`${chalk.bold(
    `The workspace ${chalk.green(currentWorkspace)} is about to be promoted,`
  )} to be sure if this is the one you want to promote, check on the link below, please.\n
  🖥️  ${chalk.green(currentWorkspace)} workspace
  See at: ${chalk.hex('#477DFF').underline(url)}\n`)

  const promptAnswer = await promptPromoteConfirm(currentWorkspace)
  if (!promptAnswer) {
    console.log(
      `${chalk.bold(
        `Ok! Workspace ${chalk.green(currentWorkspace)} was not promoted.`
      )} If you are looking for other workspaces, run ${chalk.magenta('vtex workspace list')}`
    )
    return
  }

  await promote(account, currentWorkspace)
  log.info(`Workspace ${chalk.green(currentWorkspace)} promoted successfully`)
  await useCmd('master')
}
