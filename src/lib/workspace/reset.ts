import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../utils/conf'
import { UserCancelledError } from '../../utils/errors'
import log from '../../utils/logger'
import { promptConfirm } from '../../utils/prompts'

const promptWorkspaceReset = (name: string, account: string) =>
  promptConfirm(
    `Are you sure you want to reset workspace ${chalk.green(name)} on account ${chalk.blue(account)}?`
  ).then(answer => {
    if (!answer) {
      throw new UserCancelledError()
    }
  })

export const resetWorkspace = async (account: string, workspace: string, production: boolean) => {
  try {
    log.debug('Starting to reset workspace', workspace, 'with production =', production)
    await (workspaces as any).reset(account, workspace, { production })
    log.info(
      `Workspace ${chalk.green(workspace)} was reset ${chalk.green('successfully')} using ${chalk.green(
        `production=${production}`
      )}`
    )
  } catch (err) {
    log.warn(`Workspace ${chalk.green(workspace)} was ${chalk.red('not')} reset`)
    if (err.response) {
      const { status, statusText, data = { message: null } } = err.response
      const message = data.message || data
      log.error(`Error ${status}: ${statusText}. ${message}`)
    }

    throw err
  }
}

export async function workspaceReset(workspaceName: string, preConfirm: boolean, production: boolean) {
  const account = getAccount()
  const workspace = workspaceName || getWorkspace()

  log.debug('Resetting workspace', workspace)

  if (!preConfirm) {
    await promptWorkspaceReset(workspace, account)
  }

  await resetWorkspace(account, workspace, production)
}
