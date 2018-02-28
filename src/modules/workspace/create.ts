import chalk from 'chalk'

import {CommandError} from '../../errors'
import log from '../../logger'
import {getAccount} from '../../conf'
import {workspaces} from '../../clients'

const VALID_WORKSPACE = /^[a-z][a-z0-9-]{0,126}[a-z0-9]$/

export default (name: string) => {
  if (!VALID_WORKSPACE.test(name)) {
    throw new CommandError('Whoops! That\'s not a valid workspace name. Please use only lowercase letters, numbers and hyphens.')
  }
  log.debug('Creating workspace', name)
  return workspaces.create(getAccount(), name)
    .then(() => log.info(`Workspace ${chalk.green(name)} created ${chalk.green('successfully')}`))
    .catch(err =>
      err.response && err.response.data.code === 'WorkspaceAlreadyExists'
        ? log.error(err.response.data.message)
        : Promise.reject(err),
    )
}
