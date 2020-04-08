import { flags } from '@oclif/command'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getLastUsedWorkspace, saveWorkspace } from '../../conf'
import { CommandError, UserCancelledError } from '../../errors'
import { CustomCommand } from '../../lib/CustomCommand'
import log from '../../logger'
import { createWorkspace } from './create'
import { resetWorkspace } from './reset'
import { promptConfirm } from '../../lib/prompts'

const promptWorkspaceCreation = (name: string) => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return promptConfirm('Do you wish to create it?')
}

const promptWorkspaceProductionFlag = () => promptConfirm('Should the workspace be in production mode?', false)

const shouldPromptProduction = (production: boolean): boolean => {
  return production === undefined || production === null
}

export const workspaceUse = async (name: string, production?: boolean, reset?: boolean) => {
  let confirm
  const accountName = getAccount()

  if (name === '-') {
    name = getLastUsedWorkspace()
    if (name == null) {
      throw new CommandError('No last used workspace was found')
    }
  }

  try {
    await workspaces.get(accountName, name)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      confirm = await promptWorkspaceCreation(name)
      if (!confirm) {
        throw new UserCancelledError()
      }
      if (shouldPromptProduction(production)) {
        production = await promptWorkspaceProductionFlag()
      }
      await createWorkspace(name, production)
    } else {
      throw err
    }
  }
  await saveWorkspace(name)

  if (reset && !confirm) {
    await resetWorkspace(accountName, name, production)
  }
  log.info(`You're now using the workspace ${chalk.green(name)} on account ${chalk.blue(accountName)}!`)
}

export default class WorkspaceUse extends CustomCommand {
  static description = 'Use a workspace to perform operations'

  static examples = ['vtex workspace:use workspaceName', 'vtex use worspaceName']

  static aliases = ['use']

  static flags = {
    help: flags.help({ char: 'h' }),
    production: flags.boolean({
      char: 'p',
      description: 'Create the workspace as production if it does not exist or is reset',
    }),
    reset: flags.boolean({ char: 'r', description: 'Resets workspace before using it', default: false }),
  }

  static args = [{ name: 'workspace', required: true }]

  async run() {
    const { args, flags } = this.parse(WorkspaceUse)

    await workspaceUse(args.workspace, flags.production, flags.reset)
  }
}
