import chalk from 'chalk'
import useCmd from './use'
import {client} from './utils'
import log from '../../logger'
import inquirer from 'inquirer'
import {Promise} from 'bluebird'
import {getAccount} from '../../conf'

export default {
  requiredArgs: 'name',
  description: 'Promote this workspace to master',
  handler: function (name) {
    log.debug('Promoting workspace', name)
    return Promise.try(() =>
      inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to promote workspace ${chalk.green(name)} to master?`,
      })
    )
    .then(({confirm}) => confirm || Promise.reject('User cancelled'))
    .then(() => client().promote(getAccount(), name))
    .tap(() => log.info(`Workspace ${chalk.green(name)} promoted successfully`))
    .then(() => useCmd.handler('master'))
  },
}
