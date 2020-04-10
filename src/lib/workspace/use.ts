import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, getLastUsedWorkspace, saveWorkspace } from '../../utils/conf'
import { CommandError, UserCancelledError } from '../../utils/errors'
import log from '../../utils/logger'
import { resetWorkspace } from './reset'
import { promptConfirm } from '../../utils/prompts'
import { workspaceCreate } from './create'

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
      await workspaceCreate(name, production)
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
