import * as chalk from 'chalk'
import * as inquirer from 'inquirer'

import useCmd from './use'
import log from '../../logger'
import {getAccount} from '../../conf'
import {workspaces} from '../../clients'

export default {
  requiredArgs: 'name',
  description: 'Promote this workspace to master',
  handler: (name: string) => {
    log.debug('Promoting workspace', name)
    return Promise.resolve(
      inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to promote workspace ${chalk.green(name)} to master?`,
      }),
    )
    .then(({confirm}) => confirm || Promise.reject('User cancelled'))
    .then(() => workspaces.promote(getAccount(), name))
    .tap(() => log.info(`Workspace ${chalk.green(name)} promoted successfully`))
    .then(() => useCmd.handler('master'))
  },
}
