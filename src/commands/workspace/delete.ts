import { flags } from '@oclif/command'
import chalk from 'chalk'
import { contains, flatten, head, tail } from 'ramda'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { workspaceUse } from './use'
import { promptConfirm } from '../../lib/prompts'
import { CustomCommand } from '../../lib/CustomCommand'

const account = getAccount()
const workspace = getWorkspace()

const promptWorkspaceDeletion = (names: string[]) =>
  promptConfirm(
    `Are you sure you want to delete workspace${names.length > 1 ? 's' : ''} ${chalk.green(names.join(', '))}?`,
    true
  )

export const deleteWorkspaces = async (names = []): Promise<string[]> => {
  const name = head(names)
  const decNames = tail(names)

  if (names.length === 0) {
    return []
  }

  log.debug('Starting to delete workspace', name)
  try {
    await workspaces.delete(account, name)
    log.info(`Workspace ${chalk.green(name)} deleted ${chalk.green('successfully')}`)

    return flatten([name, await deleteWorkspaces(decNames)])
  } catch (err) {
    log.warn(`Workspace ${chalk.green(name)} was ${chalk.red('not')} deleted`)
    log.error(`Error ${err.response.status}: ${err.response.statusText}. ${err.response.data.message}`)
    return deleteWorkspaces(decNames)
  }
}

export default class WorkspaceDelete extends CustomCommand {
  static description = 'Delete one or many workspaces'

  static examples = ['vtex workspace:delete workspaceName', 'vtex workspace:delete workspaceName1 workspaceName2']

  static flags = {
    help: flags.help({ char: 'h' }),
    force: flags.string({ char: 'f', description: `Ignore if you're currently using the workspace` }),
    yes: flags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [
    { name: 'workspace1', required: true },
    { name: 'ithWorkspace', required: false, multiple: true },
  ]

  async run() {
    const { raw, flags } = this.parse(WorkspaceDelete)
    const names = this.getAllArgs(raw)
    const preConfirm = flags.yes
    const force = flags.force
    log.debug(`Deleting workspace${names.length > 1 ? 's' : ''}:`, names.join(', '))

    if (!force && contains(workspace, names)) {
      return log.error(
        `You are currently using the workspace ${chalk.green(workspace)}, please change your workspace before deleting`
      )
    }

    if (!preConfirm && !(await promptWorkspaceDeletion(names))) {
      throw new UserCancelledError()
    }

    const deleted = await deleteWorkspaces(names)
    if (contains(workspace, deleted)) {
      log.warn(`The workspace you were using was deleted`)
      return workspaceUse('master')
    }
  }
}
