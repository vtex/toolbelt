import {prop} from 'ramda'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import createCmd from './create'
import {workspaces} from '../../clients'
import {getAccount, saveWorkspace} from '../../conf'
import resetWks from './reset'

const promptWorkspaceCreation = (name: string): Bluebird<boolean> => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you wish to create it?',
    }),
  )
  .then<boolean>(prop('confirm'))
}

export default async (name: string, options?) => {
  const reset = options ? (options.r || options.reset) : null
  let confirm
  try {
    await workspaces.get(getAccount(), name)
  } catch (err) {
    if (err.response && err.response.status === 404) {
      confirm = await promptWorkspaceCreation(name)
      if (!confirm) {
        log.error(`Could not use workspace ${chalk.green(name)}`)
        throw new Error('User cancelled')
      }
      await createCmd(name)
    } else {
      throw err
    }
  }
  await saveWorkspace(name)
  if (reset && !confirm) {
    await resetWks(name, {})
  }
  log.info(`You're now using the workspace ${chalk.green(name)}!`)
}
