import chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {prop, head, tail, prepend, contains, flatten} from 'ramda'

import log from '../../logger'
import {workspaces} from '../../clients'
import {getWorkspace, getAccount} from '../../conf'
import {parseArgs} from '../apps/utils'
import workspaceUse from './use'

const account = getAccount()
const workspace = getWorkspace()

const promptWorkspaceDeletion = (names: string[]): Bluebird<boolean> =>
  inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to delete workspace` + (names.length > 1 ? 's' : '') + ` ${chalk.green(names.join(', '))}?`,
  })
  .then<boolean>(prop('confirm'))

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

export default async (name: string, options) => {
  const names = prepend(name, parseArgs(options._))
  const preConfirm = options.y || options.yes
  const force = options.f || options.force
  log.debug('Deleting workspace' + (names.length > 1 ? 's' : '') + ':', names.join(', '))

  if (!force && contains(workspace, names)) {
    return log.error(`You are currently using the workspace ${chalk.green(workspace)}, please change your workspace before deleting`)
  }

  if (!preConfirm && !await promptWorkspaceDeletion(names)) {
    throw new Error('User cancelled')
  }

  const deleted = await deleteWorkspaces(names)
  if (contains(workspace, deleted)) {
    log.warn(`The workspace you were using was deleted`)
    return await workspaceUse('master')
  }
}
