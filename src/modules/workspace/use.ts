import * as Bluebird from 'bluebird'
import chalk from 'chalk'

import { workspaces } from '../../clients'
import { getAccount, saveWorkspace } from '../../conf'
import { UserCancelledError } from '../../errors'
import log from '../../logger'
import { promptConfirm } from '../utils'
import createCmd from './create'
import resetWks from './reset'

const promptWorkspaceCreation = (name: string): Bluebird<boolean> => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return promptConfirm('Do you wish to create it?')
}

const promptWorkspaceProductionFlag = (): Bluebird<boolean> =>
  promptConfirm('Should the workspace be in production mode?', false)

const shouldPromptProduction = (production: boolean): boolean => {
  return production === undefined || production === null
}

export default async (name: string, options?) => {
  const reset = options ? (options.r || options.reset) : null
  let production = options ? (options.p || options.production) : null
  let confirm
  try {
    await workspaces.get(getAccount(), name)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      confirm = await promptWorkspaceCreation(name)
      if (!confirm) {
        throw new UserCancelledError()
      }
      if (shouldPromptProduction(production)) {
        production = await promptWorkspaceProductionFlag()
      }
      await createCmd(name, {production})
    } else {
      throw err
    }
  }
  await saveWorkspace(name)
  if (reset && !confirm) {
    await resetWks(name, {production})
  }
  log.info(`You're now using the workspace ${chalk.green(name)}!`)
}
