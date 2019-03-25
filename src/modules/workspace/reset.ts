import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { promptConfirm } from '../utils'

const promptWorkspaceReset = (name: string): Bluebird<void> =>
  promptConfirm(
    `Are you sure you want to reset workspace ${chalk.green(name)}?`
  ).then(answer => {
    if (!answer) {
      throw new UserCancelledError()
    }
  })

export default async (name: string, options) => {
  const account = getAccount()
  const workspace = name || getWorkspace()
  const preConfirm = options.y || options.yes
  const production = !!(options.p || options.production)

  log.debug('Resetting workspace', workspace)

  if (!preConfirm) {
    await promptWorkspaceReset(workspace)
  }

  try {
    log.debug('Starting to reset workspace', workspace, 'with production =', production)
    await (workspaces as any).reset(account, workspace, { production })
    log.info(`Workspace ${chalk.green(workspace)} was reset ${chalk.green('successfully')} using ${chalk.green(`production=${production}`)}`)
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
