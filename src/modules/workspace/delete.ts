import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {prop, head, tail} from 'ramda'

import log from '../../logger'
import {workspaces} from '../../clients'
import {getWorkspace, getAccount} from '../../conf'

const ARGS_START_INDEX = 3
const account = getAccount()
const workspace = getWorkspace()

const promptWorkspaceDeletion = (name: string): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete workspace ${chalk.green(name)}?`,
    }),
  )
  .then<boolean>(prop('confirm'))

const deleteWorkspaces = (names = [], preConfirm: boolean, force: boolean): Bluebird<void | never> => {
  const name = head(names)
  const decNames = tail(names)
  log.debug('Starting to delete workspace', name)
  if (!force && name === workspace) {
    log.error(`You're currently using the workspace ${chalk.green(name)}, please change your workspace before deleting`)
    return Promise.resolve()
  }
  return Promise.resolve(preConfirm || promptWorkspaceDeletion(name))
    .then<boolean>(confirm => confirm || Promise.reject(new Error('User cancelled')))
    .then(() => workspaces.delete(account, name))
    .tap(() => log.info(`Workspace ${chalk.green(name)} deleted successfully`))
    .then(() =>
      decNames.length > 0
        ? deleteWorkspaces(decNames, preConfirm, force)
        : Promise.resolve(),
    )
    .catch(err => {
      // A warn message will display the workspaces not deleted.
      if (!err.toolbeltWarning) {
        log.warn(`The following workspace(s) were not deleted: ${names.join(', ')}`)
        // the warn message is only displayed the first time the err occurs.
        err.toolbeltWarning = true
      }
      return Promise.reject(err)
    })
}

export default {
  requiredArgs: 'name',
  description: 'Delete a single or various workspaces',
  options: [
    {
      short: 'y',
      long: 'yes',
      description: 'Auto confirm prompts',
      type: 'boolean',
    },
    {
      short: 'f',
      long: 'force',
      description: 'Ignore if you\'re currently using the workspace',
      type: 'boolean',
    },
  ],
  handler: (name: string, options) => {
    const names = [name, ...options._.slice(ARGS_START_INDEX)]
    const preConfirm = options.y || options.yes
    const force = options.f || options.force
    log.debug('Deleting workspace(s)', names)
    return deleteWorkspaces(names, preConfirm, force)
      .catch(err => {
        if (err.message === 'User cancelled') {
          log.error(err.message)
          return Promise.resolve()
        }
        return Promise.reject(err)
      })
  },
}
