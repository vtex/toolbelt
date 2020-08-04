import chalk from 'chalk'
import axios from 'axios'
import terminalLink from 'terminal-link'
import boxen from 'boxen'
import ora from 'ora'
import { createFlowIssueError } from '../../api/error/utils'
import { createWorkspacesClient } from '../../api/clients/IOClients/infra/Workspaces'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { promptConfirm } from '../../api/modules/prompts'
import { VBase } from '../../api/clients/IOClients/infra/VBase'
import authUrl from '../url'
import useCmd from './use'
import { ColorifyConstants } from '../../lib/constants/Colors'

const { checkForConflicts } = VBase.createClient()
const { promote, get } = createWorkspacesClient()
const { account, workspace: currentWorkspace } = SessionManager.getSingleton()
const workspaceUrl = authUrl()

const throwIfIsMaster = (workspace: string) => {
  if (workspace === 'master') {
    throw createFlowIssueError(`It is not possible to promote workspace ${workspace} to master`)
  }
}

const handleConflict = async () => {
  const conflictsFound = await checkForConflicts()
  if (conflictsFound) {
    await axios.get(workspaceUrl)
  }
}

const isPromotable = async (workspace: string) => {
  throwIfIsMaster(workspace)

  const meta = await get(account, currentWorkspace)
  if (!meta.production) {
    throw createFlowIssueError(
      `Workspace ${ColorifyConstants.ID(workspace)} is not a ${ColorifyConstants.ID(
        'production'
      )} workspace\nOnly production workspaces may be promoted\nUse the command ${ColorifyConstants.COMMAND_OR_VTEX_REF(
        'vtex workspace create <workspace> --production'
      )} to create a production workspace`
    )
  }

  const spinner = ora('Preparing the workspace to be promoted').start()
  spinner.color = 'magenta'
  await handleConflict()
  spinner.stop()
}

const promptPromoteConfirm = (workspace: string): Promise<boolean> =>
  promptConfirm(
    `Do you want to promote ${ColorifyConstants.ID(workspace)} to master? ${chalk.dim(
      `Doing so, the work you did locally will be taken to production.`
    )}`,
    true
  )

export default async () => {
  log.debug('Promoting workspace', currentWorkspace)
  await isPromotable(currentWorkspace)
  console.log(`${chalk.bold(
    `The workspace ${ColorifyConstants.ID(currentWorkspace)} is about to be promoted,`
  )} to be sure if this is the one you want to promote, check on the link below, please.\n
  🖥️  ${ColorifyConstants.ID(currentWorkspace)} workspace
  See at: ${ColorifyConstants.URL_INTERACTIVE(workspaceUrl)}\n`)

  const promptAnswer = await promptPromoteConfirm(currentWorkspace)
  if (!promptAnswer) {
    log.info(
      `${chalk.bold(
        `Ok! Workspace ${ColorifyConstants.ID(currentWorkspace)} was not promoted.`
      )} If you are looking for other workspaces, run ${ColorifyConstants.COMMAND_OR_VTEX_REF(
        'vtex workspace list'
      )}.\n`
    )
    return
  }

  await promote(account, currentWorkspace)
  log.info(
    `✨ ${chalk.bold('Success!')} The workspace ${ColorifyConstants.ID(
      currentWorkspace
    )} was promoted to ${ColorifyConstants.ID(
      'master'
    )}, taking your changes to the final users. All the content it had is now at the workspace ${ColorifyConstants.ID(
      'master'
    )} and the workspace ${ColorifyConstants.ID(currentWorkspace)} was deleted.`
  )

  console.log(
    boxen(
      `Learn more about why we ask you to choose a workspace ${terminalLink(
        'here',
        ''
      )}, and send us\nfeedback about this approach.`,
      {
        padding: 1,
        margin: 1,
      }
    )
  )

  await useCmd('master')
}
