import chalk from 'chalk'
import log from '../../logger'
import {workspaces} from '../../clients'
import inquirer from 'inquirer'
import {head, tail} from 'ramda'
import {Promise} from 'bluebird'
import {getWorkspace, getAccount} from '../../conf'

const ARGS_START_INDEX = 3
const account = getAccount()
const workspace = getWorkspace()

function promptWorkspaceDeletion (name) {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to delete workspace ${chalk.green(name)}?`,
  })
  .then(({confirm}) => confirm)
}

function deleteWorkspaces (names = [], preConfirm, force) {
  const name = head(names)
  const decNames = tail(names)
  log.debug('Starting to delete workspace', name)
  if (!force && name === workspace) {
    log.error(`You're currently using the workspace ${chalk.green(name)}, please change your workspace before deleting`)
    return Promise.resolve()
  }

  return Promise.try(() => preConfirm || promptWorkspaceDeletion(name))
  .then(confirm => confirm || Promise.reject('User cancelled'))
  .then(() => workspaces.delete(account, name))
  .tap(() =>
    log.info(`Workspace ${chalk.green(name)} deleted successfully`)
  )
  .then(() =>
    decNames.length > 0
      ? deleteWorkspaces(decNames, preConfirm, force)
      : Promise.resolve()
  )
  .catch(err => {
    if (names.length > 1 && !err.toolbeltWarning) {
      log.warn(`The following workspace(s) were not deleted: ${names.join(', ')}`)
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
  handler: function (name, options) {
    const names = [name, ...options._.slice(ARGS_START_INDEX)]
    const preConfirm = options.y || options.yes
    const force = options.f || options.force
    log.debug('Deleting workspace(s)', names)
    return deleteWorkspaces(names, preConfirm, force)
  },
}
