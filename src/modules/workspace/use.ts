import {prop} from 'ramda'
import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'

import log from '../../logger'
import createCmd from './create'
import {workspaces} from '../../clients'
import {getAccount, saveWorkspace} from '../../conf'

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

export default {
  requiredArgs: 'name',
  description: 'Use a workspace to perform operations',
  handler: (name: string) => {
    return workspaces.get(getAccount(), name)
      .catch(err => {
        if (err.response && err.response.status === 404) {
          return promptWorkspaceCreation(name)
            .then(confirm => {
              if (!confirm) {
                log.error(`Could not use workspace ${chalk.green(name)}`)
                return Promise.reject(null)
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
