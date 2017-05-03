import * as chalk from 'chalk'

import log from '../../logger'
import {getAccount} from '../../conf'
import {workspaces} from '../../clients'

const VALID_WORKSPACE = /^[a-z][a-z0-9-]{0,126}[a-z0-9]$/

export default {
  requiredArgs: 'name',
  description: 'Create a new workspace with this name',
  handler: (name: string) => {
    if (!VALID_WORKSPACE.test(name)) {
      const err = new Error()
      err.name = 'InterruptionError'
      log.error('Whoops! That\'s not a valid workspace name. Please use only lowercase letters, numbers and hyphens.')
      throw err
    }
    log.debug('Creating workspace', name)
    return workspaces.create(getAccount(), name)
      .then(() => log.info(`Workspace ${chalk.green(name)} created successfully`))
      .catch(err =>
        err.response && err.response.data.code === 'WorkspaceAlreadyExists'
          ? log.error(err.response.data.message)
          : Promise.reject(err),
      )
  },
}
