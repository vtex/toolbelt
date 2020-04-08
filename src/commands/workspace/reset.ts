import { flags as oclifFlags } from '@oclif/command'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'
import { promptConfirm } from '../../lib/prompts'

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

export default class WorkspaceReset extends CustomCommand {
  static description = 'Delete and recreate a workspace'

  static examples = ['vtex workspace:reset', 'vtex workspace:reset workspaceName']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
    production: oclifFlags.boolean({
      char: 'p',
      description: 'Re-create the workspace as a production one',
      default: false,
    }),
    yes: oclifFlags.boolean({ char: 'y', description: 'Answer yes to confirmation prompts' }),
  }

  static args = [{ name: 'workspaceName', required: false }]

  async run() {
    const { args, flags } = this.parse(WorkspaceReset)

    const account = getAccount()
    const workspace = args.workspaceName || getWorkspace()
    const preConfirm = flags.yes
    const { production } = flags

    log.debug('Resetting workspace', workspace)

    if (!preConfirm) {
      await promptWorkspaceReset(workspace, account)
    }

    await resetWorkspace(account, workspace, production)
  }
}
