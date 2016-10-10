import chalk from 'chalk'
import log from '../../logger'
import {client} from './utils'
import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import {getWorkspace, getAccount} from '../../conf'

const promptWorkspaceDeletion = (name) => {
  return inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Are you sure you want to delete workspace ${chalk.green(name)}?`,
  })
  .then(({confirm}) => confirm)
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
    const names = options._ ? [name, ...options._.slice(3)] : [name]
    const preConfirm = options.y || options.yes
    const force = options.f || options.force
    const deleteWorkspace = (names, preConfirm) => {
      const name = names.shift()
      if (!force && name === getWorkspace()) {
        log.error(`You're currently using the workspace ${chalk.green(name)}, please change your workspace before deleting`)
        return Promise.resolve()
      }

      return Promise.try(() =>
        preConfirm || promptWorkspaceDeletion(name)
      )
      .then(confirm => confirm || Promise.reject('User cancelled'))
      .then(() => client().delete(getAccount(), name))
      .tap(() =>
        log.info(`Workspace ${chalk.green(name)} deleted successfully`)
      )
      .then(() =>
        names.length > 0
          ? deleteWorkspace(names, preConfirm)
          : Promise.resolve()
      )
    }

    log.debug('Deleting workspace(s)', names)
    return deleteWorkspace(names, preConfirm)
  },
}
