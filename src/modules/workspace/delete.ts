import chalk from 'chalk'
import { contains, flatten, head, tail } from 'ramda'

import { workspaces } from '../../clients'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import workspaceUse from './use'
import { SessionManager } from '../../lib/session/SessionManager'

const promptWorkspaceDeletion = (names: string[]) =>
  promptConfirm(
    `Are you sure you want to delete workspace${names.length > 1 ? 's' : ''} ${chalk.green(names.join(', '))}?`,
    true
  )

export const deleteWorkspaces = async (account: string, names = []): Promise<string[]> => {
  const name = head(names)
  const decNames = tail(names)

  if (names.length === 0) {
    return []
  }

  log.debug('Starting to delete workspace', name)
  try {
    await workspaces.delete(account, name)
    log.info(`Workspace ${chalk.green(name)} deleted ${chalk.green('successfully')}`)

    return flatten([name, await deleteWorkspaces(account, decNames)])
  } catch (err) {
    log.warn(`Workspace ${chalk.green(name)} was ${chalk.red('not')} deleted`)
    log.error(`Error ${err.response.status}: ${err.response.statusText}. ${err.response.data.message}`)
    return deleteWorkspaces(account, decNames)
  }
}

export default async (names: string[], options) => {
  const preConfirm = options.y || options.yes
  const force = options.f || options.force
  const { account, workspace } = SessionManager.getSingleton()

  log.debug(`Deleting workspace${names.length > 1 ? 's' : ''}:`, names.join(', '))

  if (!force && contains(workspace, names)) {
    return log.error(
      `You are currently using the workspace ${chalk.green(workspace)}, please change your workspace before deleting`
    )
  }

  if (!preConfirm && !(await promptWorkspaceDeletion(names))) {
    return
  }

  const deleted = await deleteWorkspaces(account, names)
  if (contains(workspace, deleted)) {
    log.warn(`The workspace you were using was deleted`)
    return workspaceUse('master')
  }
}
