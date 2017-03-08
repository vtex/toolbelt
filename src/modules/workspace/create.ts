import * as chalk from 'chalk'

import log from '../../logger'
import {getAccount} from '../../conf'
import {workspaces} from '../../clients'

export default {
  requiredArgs: 'name',
  description: 'Create a new workspace with this name',
  handler: (name: string) => {
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
