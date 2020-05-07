import chalk from 'chalk'
import { CommandError } from '../../errors'
import { createWorkspacesClient } from '../../lib/clients/Workspaces'
import { SessionManager } from '../../lib/session/SessionManager'
import log from '../../logger'
import { promptConfirm } from '../prompts'
import createCmd from './create'
import resetWks from './reset'

const promptWorkspaceCreation = (name: string) => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return promptConfirm('Do you wish to create it?')
}

const promptWorkspaceProductionFlag = () => promptConfirm('Should the workspace be in production mode?', false)

const shouldPromptProduction = (production: boolean): boolean => {
  return production === undefined || production === null
}

export default async (name: string, options?) => {
  const reset = options ? options.r || options.reset : null
  let production = options ? options.p || options.production : null
  let created = false

  const session = SessionManager.getSingleton()

  const accountName = session.account

  if (name === '-') {
    name = session.lastUsedWorkspace
    if (name == null) {
      throw new CommandError('No last used workspace was found')
    }
  }

  try {
    const workspaces = createWorkspacesClient()
    await workspaces.get(accountName, name)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      const shouldCreate = await promptWorkspaceCreation(name)
      if (!shouldCreate) {
        return
      }
      if (shouldPromptProduction(production)) {
        production = await promptWorkspaceProductionFlag()
      }
      await createCmd(name, { production })
      created = true
    } else {
      throw err
    }
  }

  session.workspaceSwitch(name)

  if (reset && !created) {
    await resetWks(name, { production })
  }
  log.info(`You're now using the workspace ${chalk.green(name)} on account ${chalk.blue(accountName)}!`)
}
