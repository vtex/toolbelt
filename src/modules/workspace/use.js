import chalk from 'chalk'
import log from '../../logger'
import {workspaces} from '../../clients'
import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import createCmd from './create'
import {getAccount, saveWorkspace} from '../../conf'

const promptWorkspaceCreation = (name) => {
  console.log(chalk.blue('!'), `Workspace ${chalk.green(name)} doesn't exist`)
  return Promise.try(() =>
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you wish to create it?',
    })
  )
  .then(({confirm}) => confirm)
}

export default {
  requiredArgs: 'name',
  description: 'Use a workspace to perform operations',
  handler: function (name) {
    return workspaces.get(getAccount(), name)
    .catch(err => {
      if (err.response && err.response.data.code === 'WorkspaceNotFound') {
        return promptWorkspaceCreation(name)
        .then(confirm => {
          if (!confirm) {
            log.error(`Could not use workspace ${chalk.green(name)}`)
            return Promise.reject()
          }
          return createCmd.handler(name)
        })
      }
      return Promise.reject(err)
    })
    .then(() => saveWorkspace(name))
    .tap(() => log.info(`You're now using the workspace ${chalk.green(name)}!`))
    .catch(err => err ? Promise.reject(err) : Promise.resolve())
  },
}
