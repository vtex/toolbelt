import * as Bluebird from 'bluebird'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'

const promptWorkspaceReset = (name: string): Bluebird<void> =>
  inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to reset workspace ${chalk.green(name)}?`,
  })
    .then(({ confirm }) => {
      if (!confirm) {
        throw new UserCancelledError()
      }
    })

export default async (name: string, options) => {
  const account = getAccount()
  const workspace = name || getWorkspace()
  const preConfirm = options.y || options.yes

  log.debug('Resetting workspace', workspace)

  if (!preConfirm) {
    await promptWorkspaceReset(workspace)
  }

  try {
    log.debug('Starting to reset workspace', workspace)
    await (workspaces as any).reset(account, workspace)
    log.info(`Workspace ${chalk.green(workspace)} was reset ${chalk.green('successfully')}`)
  } catch (err) {
    log.warn(`Workspace ${chalk.green(workspace)} was ${chalk.red('not')} reseted`)
    if (err.response) {
      const { status, statusText, data = { message: null } } = err.response
      const message = data.message || data
      log.error(`Error ${status}: ${statusText}. ${message}`)
    }

    throw err
  }
}
