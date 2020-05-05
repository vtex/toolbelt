import chalk from 'chalk'
import { workspaces } from '../../clients'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import { ensureValidEdition } from './common/edition'

const promptWorkspaceReset = (name: string, account: string) =>
  promptConfirm(`Are you sure you want to reset workspace ${chalk.green(name)} on account ${chalk.blue(account)}?`)

export default async (name: string, options) => {
  const session = SessionManager.getSingleton()
  const { account } = session
  const workspace = name || session.workspace
  const preConfirm = options.y || options.yes
  const production = !!(options.p || options.production)

  log.debug('Resetting workspace', workspace)

  let promptAnswer
  if (!preConfirm) {
    promptAnswer = await promptWorkspaceReset(workspace, account)
  }

  if (promptAnswer) {
    try {
      log.debug('Starting to reset workspace', workspace, 'with production =', production)
      await (workspaces as any).reset(account, workspace, { production })
      log.info(
        `Workspace ${chalk.green(workspace)} was reset ${chalk.green('successfully')} using ${chalk.green(
          `production=${production}`
        )}`
      )
      await ensureValidEdition(workspace)
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
}
